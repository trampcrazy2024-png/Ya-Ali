#include <jni.h>
#include <android/log.h>
#include <algorithm>
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

std::string make_prompt(const std::string &prompt) {
    return prompt;
}

std::string generate_locked(const std::string &prompt, int max_tokens, float temperature) {
    if (!g_model || !g_ctx) return "Local llama.cpp engine is not ready";
    const llama_vocab *vocab = llama_model_get_vocab(g_model);
    if (!vocab) return "Model vocabulary is unavailable";

    std::vector<llama_token> tokens(prompt.size() + 512);
    int32_t n = llama_tokenize(vocab, prompt.c_str(), (int32_t)prompt.size(), tokens.data(), (int32_t)tokens.size(), true, false);
    if (n < 0) {
        tokens.resize((size_t)-n + 8);
        n = llama_tokenize(vocab, prompt.c_str(), (int32_t)prompt.size(), tokens.data(), (int32_t)tokens.size(), true, false);
    }
    if (n <= 0) return "Unable to tokenize prompt";
    tokens.resize((size_t)n);
    const size_t max_prompt = (size_t)std::max<uint32_t>(1024, llama_n_ctx(g_ctx) > 256 ? llama_n_ctx(g_ctx) - 256 : 1024);
    if (tokens.size() > max_prompt) {
        std::vector<llama_token> trimmed;
        const size_t head = std::min<size_t>(128, max_prompt / 4);
        trimmed.insert(trimmed.end(), tokens.begin(), tokens.begin() + head);
        trimmed.insert(trimmed.end(), tokens.end() - (max_prompt - head), tokens.end());
        tokens.swap(trimmed);
    }

    llama_memory_clear(llama_get_memory(g_ctx), true);
    llama_batch batch = llama_batch_get_one(tokens.data(), (int32_t)tokens.size());
    if (llama_decode(g_ctx, batch) < 0) return "Initial prompt decode failed";

    auto sampler_params = llama_sampler_chain_default_params();
    llama_sampler *sampler = llama_sampler_chain_init(sampler_params);
    if (!sampler) return "Sampler initialization failed";
    llama_sampler_chain_add(sampler, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_p(0.92f, 1));
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(std::max(0.05f, std::min(1.5f, temperature))));
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));

    std::string output;
    output.reserve((size_t)max_tokens * 4);
    for (int i = 0; i < max_tokens; ++i) {
        llama_token id = llama_sampler_sample(sampler, g_ctx, -1);
        llama_sampler_accept(sampler, id);
        if (llama_vocab_is_eog(vocab, id)) break;
        char buf[256];
        int32_t piece = llama_token_to_piece(vocab, id, buf, sizeof(buf), 0, true);
        if (piece < 0) break;
        output.append(buf, (size_t)piece);
        if (output.size() > 16000) break;
        llama_batch next = llama_batch_get_one(&id, 1);
        if (llama_decode(g_ctx, next) < 0) break;
    }
    llama_sampler_free(sampler);
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
        return env->NewStringUTF("Local inference crashed or ran out of memory");
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_yaali_assistant_plugins_LocalAIPlugin_nativeUnloadModel(JNIEnv *, jclass) {
    std::lock_guard<std::mutex> lock(g_mutex);
    unload_locked();
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_yaali_assistant_plugins_LocalAIPlugin_nativeStatus(JNIEnv *env, jclass) {
    std::lock_guard<std::mutex> lock(g_mutex);
    std::string s = g_model && g_ctx ? "ready" : "not-ready";
    if (!g_path.empty()) s += "|" + g_path;
    return env->NewStringUTF(s.c_str());
}
