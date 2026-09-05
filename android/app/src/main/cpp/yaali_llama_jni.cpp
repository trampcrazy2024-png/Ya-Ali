#include <jni.h>
#include <android/log.h>
#include <algorithm>
#include <atomic>
#include <cstring>
#include <mutex>
#include <string>
#include <vector>
#include "llama.h"

#define TAG "YaAli-llama"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

namespace {
std::mutex g_mutex;
llama_model * g_model = nullptr;
llama_context * g_ctx = nullptr;
std::string g_path;
int g_threads = 4;
std::atomic<bool> g_cancel{false};

std::string jstr(JNIEnv *env, jstring s) {
    if (!s) return {};
    const char *p = env->GetStringUTFChars(s, nullptr);
    std::string out = p ? p : "";
    if (p) env->ReleaseStringUTFChars(s, p);
    return out;
}

void unload_locked() {
    if (g_ctx) { llama_free(g_ctx); g_ctx = nullptr; }
    if (g_model) { llama_model_free(g_model); g_model = nullptr; }
    g_path.clear();
}


std::string generate_locked(const std::string &raw_prompt, int max_tokens, float temperature) {
    g_cancel.store(false);
    if (!g_model || !g_ctx) return "__YAALI_ERROR__Local llama.cpp engine is not ready";
    const llama_vocab *vocab = llama_model_get_vocab(g_model);
    if (!vocab) return "__YAALI_ERROR__Model vocabulary is unavailable";

    // Use the GGUF model's own chat template whenever available. This is
    // important for Llama/Qwen/Gemma-style instruct models: feeding a plain
    // "user:/assistant:" transcript often produces poor or apparently stuck output.
    std::string prompt = raw_prompt;
    const char *tmpl = llama_model_chat_template(g_model, nullptr);
    if (tmpl && *tmpl) {
        llama_chat_message msg{ "user", raw_prompt.c_str() };
        int need = llama_chat_apply_template(tmpl, &msg, 1, true, nullptr, 0);
        if (need > 0) {
            std::vector<char> formatted((size_t)need + 1);
            int written = llama_chat_apply_template(tmpl, &msg, 1, true, formatted.data(), (int32_t)formatted.size());
            if (written > 0) prompt.assign(formatted.data(), (size_t)written);
        }
    }

    const int32_t needed = -llama_tokenize(vocab, prompt.c_str(), (int32_t)prompt.size(), nullptr, 0, true, true);
    if (needed <= 0) return "__YAALI_ERROR__Unable to tokenize prompt";
    std::vector<llama_token> tokens((size_t)needed);
    const int32_t n = llama_tokenize(vocab, prompt.c_str(), (int32_t)prompt.size(), tokens.data(), (int32_t)tokens.size(), true, true);
    if (n <= 0) return "__YAALI_ERROR__Unable to tokenize prompt";
    tokens.resize((size_t)n);

    const int32_t n_ctx = (int32_t)llama_n_ctx(g_ctx);
    const int32_t reserve = std::min(512, std::max(128, max_tokens));
    const int32_t max_prompt = std::max(256, n_ctx - reserve);
    if ((int32_t)tokens.size() > max_prompt) {
        std::vector<llama_token> trimmed;
        const size_t keep_head = std::min<size_t>(64, (size_t)max_prompt / 5);
        trimmed.insert(trimmed.end(), tokens.begin(), tokens.begin() + keep_head);
        trimmed.insert(trimmed.end(), tokens.end() - ((size_t)max_prompt - keep_head), tokens.end());
        tokens.swap(trimmed);
    }

    llama_memory_clear(llama_get_memory(g_ctx), true);
    llama_batch batch = llama_batch_get_one(tokens.data(), (int32_t)tokens.size());
    if (llama_decode(g_ctx, batch) != 0) return "__YAALI_ERROR__Initial prompt decode failed";

    auto sampler_params = llama_sampler_chain_default_params();
    llama_sampler *sampler = llama_sampler_chain_init(sampler_params);
    if (!sampler) return "__YAALI_ERROR__Sampler initialization failed";
    llama_sampler_chain_add(sampler, llama_sampler_init_min_p(0.05f, 1));
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(std::max(0.05f, std::min(1.2f, temperature))));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));

    std::string output;
    output.reserve((size_t)max_tokens * 4);
    for (int i = 0; i < max_tokens; ++i) {
        if (g_cancel.load()) { llama_sampler_free(sampler); return "__YAALI_CANCELLED__"; }
        const int32_t used = (int32_t)llama_memory_seq_pos_max(llama_get_memory(g_ctx), 0) + 1;
        if (used >= n_ctx) break;
        llama_token id = llama_sampler_sample(sampler, g_ctx, -1);
        if (llama_vocab_is_eog(vocab, id)) break;
        llama_sampler_accept(sampler, id);
        char buf[512];
        int32_t piece = llama_token_to_piece(vocab, id, buf, sizeof(buf), 0, true);
        if (piece < 0) break;
        output.append(buf, (size_t)piece);
        if (output.size() > 24000) break;
        llama_batch next = llama_batch_get_one(&id, 1);
        if (llama_decode(g_ctx, next) != 0) break;
    }
    llama_sampler_free(sampler);
    if (output.empty()) return "__YAALI_ERROR__Local model generated no text. Try a smaller GGUF model or a shorter prompt.";
    return output;
}
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_yaali_assistant_plugins_LocalAIPlugin_nativeLoadModel(JNIEnv *env, jclass, jstring path, jint context, jint threads) {
    std::lock_guard<std::mutex> lock(g_mutex);
    std::string p = jstr(env, path);
    if (p.empty()) return env->NewStringUTF("Model path is empty");
    unload_locked();
    llama_backend_init();
    llama_model_params mp = llama_model_default_params();
    mp.n_gpu_layers = 0;
    mp.load_mode = LLAMA_LOAD_MODE_MMAP;
    g_model = llama_model_load_from_file(p.c_str(), mp);
    if (!g_model) { LOGE("failed to load %s", p.c_str()); return env->NewStringUTF("llama.cpp could not load this GGUF model"); }
    llama_context_params cp = llama_context_default_params();
    cp.n_ctx = (uint32_t)std::max(1024, std::min(8192, (int)context));
    cp.n_batch = std::min<uint32_t>(cp.n_ctx, 2048);
    cp.n_threads = std::max(1, std::min(8, (int)threads));
    cp.n_threads_batch = cp.n_threads;
    g_ctx = llama_init_from_model(g_model, cp);
    if (!g_ctx) { unload_locked(); return env->NewStringUTF("llama.cpp context initialization failed; model may be too large for available memory"); }
    g_path = p; g_threads = cp.n_threads;
    LOGI("loaded GGUF: %s ctx=%u threads=%d", p.c_str(), cp.n_ctx, g_threads);
    return env->NewStringUTF("");
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_yaali_assistant_plugins_LocalAIPlugin_nativeGenerate(JNIEnv *env, jclass, jstring prompt, jint maxTokens, jfloat temperature) {
    std::lock_guard<std::mutex> lock(g_mutex);
    try {
        std::string out = generate_locked(jstr(env, prompt), std::max(64, std::min(1024, (int)maxTokens)), temperature);
        return env->NewStringUTF(out.c_str());
    } catch (...) {
        return env->NewStringUTF("__YAALI_ERROR__Local inference crashed or ran out of memory");
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_yaali_assistant_plugins_LocalAIPlugin_nativeCancelGeneration(JNIEnv *, jclass) {
    g_cancel.store(true);
}

extern "C" JNIEXPORT void JNICALL
Java_com_yaali_assistant_plugins_LocalAIPlugin_nativeUnloadModel(JNIEnv *, jclass) {
    std::lock_guard<std::mutex> lock(g_mutex);
    g_cancel.store(true);
    unload_locked();
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_yaali_assistant_plugins_LocalAIPlugin_nativeStatus(JNIEnv *env, jclass) {
    std::lock_guard<std::mutex> lock(g_mutex);
    std::string s = g_model && g_ctx ? "ready" : "not-ready";
    if (!g_path.empty()) s += "|" + g_path;
    return env->NewStringUTF(s.c_str());
}
