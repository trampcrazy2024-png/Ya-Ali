package com.yaali.assistant.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.pytorch.executorch.extension.llm.LlmCallback;
import org.pytorch.executorch.extension.llm.LlmGenerationConfig;
import org.pytorch.executorch.extension.llm.LlmModule;
import com.google.ai.edge.litertlm.Backend;
import com.google.ai.edge.litertlm.Engine;
import com.google.ai.edge.litertlm.EngineConfig;
import com.google.ai.edge.litertlm.Conversation;
import com.google.ai.edge.litertlm.ConversationConfig;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import ai.onnxruntime.OrtEnvironment;

@CapacitorPlugin(name = "EdgeAI")
public class EdgeAIRuntimePlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Map<String, LlmModule> execuTorchModels = new HashMap<>();
    private final Map<String, Engine> liteRtEngines = new HashMap<>();
    private final Map<String, Conversation> liteRtConversations = new HashMap<>();

    @PluginMethod
    public void capabilities(PluginCall call) {
        JSObject out = new JSObject();
        out.put("native", true);
        out.put("executorch", classExists("org.pytorch.executorch.extension.llm.LlmModule"));
        out.put("litertLmGeneration", classExists("com.google.ai.edge.litertlm.Conversation"));
        out.put("onnxRuntime", onnxRuntimeAvailable());
        out.put("onnxGenAI", classExists("ai.onnxruntime.genai.Model"));
        out.put("litertLm", classExists("com.google.ai.edge.litertlm.Engine"));
        out.put("version", "0.6.0-edge-runtime");
        call.resolve(out);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject out = new JSObject();
        out.put("native", true);
        out.put("executorchLoaded", execuTorchModels.size());
        out.put("onnxRuntime", onnxRuntimeAvailable());
        out.put("onnxGenAI", classExists("ai.onnxruntime.genai.Model"));
        out.put("litertLm", classExists("com.google.ai.edge.litertlm.Engine"));
        out.put("executorch", classExists("org.pytorch.executorch.extension.llm.LlmModule"));
        call.resolve(out);
    }

    @PluginMethod
    public void generate(PluginCall call) {
        final String runtime = call.getString("runtime", "");
        final String modelPath = call.getString("modelPath", "");
        final String prompt = call.getString("prompt", "");
        final String tokenizerPath = call.getString("tokenizerPath", "");
        final int maxTokens = Math.max(64, Math.min(2048, call.getInt("maxTokens", 512)));
        final float temperature = (float)Math.max(0.05, Math.min(1.5, call.getDouble("temperature", 0.65)));
        if (modelPath.isEmpty() || prompt.isEmpty()) { call.reject("modelPath و prompt الزامی هستند."); return; }

        executor.execute(() -> {
            try {
                if ("executorch".equals(runtime)) {
                    generateExecuTorch(call, modelPath, tokenizerPath, prompt, maxTokens, temperature);
                } else if ("onnx-genai".equals(runtime)) {
                    generateOnnxGenAI(call, modelPath, prompt, maxTokens, temperature);
                } else if ("litert-lm".equals(runtime)) {
                    generateLiteRtLm(call, modelPath, prompt, maxTokens);
                } else {
                    call.reject("Runtime ناشناخته: " + runtime);
                }
            } catch (Throwable e) {
                call.reject("Edge runtime failed: " + (e.getMessage() == null ? e.toString() : e.getMessage()));
            }
        });
    }

    private void generateExecuTorch(PluginCall call, String modelPath, String tokenizerPath, String prompt, int maxTokens, float temperature) throws Exception {
        if (tokenizerPath == null || tokenizerPath.isEmpty()) throw new IllegalArgumentException("برای PTE مسیر tokenizer.model را نیز مشخص کنید.");
        final LlmModule module;
        synchronized (execuTorchModels) {
            module = execuTorchModels.containsKey(modelPath) ? execuTorchModels.get(modelPath) : new LlmModule(LlmModule.MODEL_TYPE_TEXT, modelPath, tokenizerPath, temperature);
            if (!execuTorchModels.containsKey(modelPath)) execuTorchModels.put(modelPath, module);
        }
        try {
            module.load();
        } catch (NoSuchMethodError ignored) { /* lazy-load on generate for older API */ }

        final StringBuilder text = new StringBuilder();
        final boolean[] resolved = {false};
        LlmGenerationConfig config = LlmGenerationConfig.create()
                .seqLen(Math.max(256, Math.min(4096, maxTokens + 256)))
                .maxNewTokens(maxTokens)
                .temperature(temperature)
                .echo(false)
                .build();
        module.generate(prompt, config, new LlmCallback() {
            @Override public void onResult(String token) { if (token != null) text.append(token); }
            @Override public void onStats(String statsJson) {
                if (resolved[0]) return; resolved[0] = true;
                resolveText(call, text.toString(), "executorch", statsJson);
            }
            @Override public void onError(int errorCode, String message) {
                if (resolved[0]) return; resolved[0] = true; call.reject("ExecuTorch " + errorCode + ": " + message);
            }
        });
    }

    private void generateLiteRtLm(PluginCall call, String modelPath, String prompt, int maxTokens) throws Exception {
        final String backendName = call.getString("backend", "CPU");
        final String cacheDir = getContext().getCacheDir().getAbsolutePath();
        final Engine engine;
        synchronized (liteRtEngines) {
            engine = liteRtEngines.containsKey(modelPath) ? liteRtEngines.get(modelPath) : createLiteRtEngine(modelPath, backendName, cacheDir, maxTokens);
            if (!liteRtEngines.containsKey(modelPath)) liteRtEngines.put(modelPath, engine);
        }
        final Conversation conversation;
        synchronized (liteRtConversations) {
            conversation = liteRtConversations.containsKey(modelPath)
                    ? liteRtConversations.get(modelPath)
                    : engine.createConversation(new ConversationConfig());
            if (!liteRtConversations.containsKey(modelPath)) liteRtConversations.put(modelPath, conversation);
        }
        final long started=System.currentTimeMillis();
        final Object message=conversation.sendMessage(prompt);
        final String text=String.valueOf(message == null ? "" : message.toString()).trim();
        if(text.isEmpty()) throw new IllegalStateException("LiteRT-LM returned an empty response");
        resolveText(call,text,"litert-lm", "{\"elapsedMs\":"+(System.currentTimeMillis()-started)+",\"backend\":\""+backendName+"\"}");
    }

    private Engine createLiteRtEngine(String modelPath, String backendName, String cacheDir, int maxTokens) {
        Backend backend;
        if ("GPU".equalsIgnoreCase(backendName)) backend = new Backend.GPU();
        else if ("NPU".equalsIgnoreCase(backendName)) backend = new Backend.NPU(getContext().getApplicationInfo().nativeLibraryDir);
        else backend = new Backend.CPU(null, null);
        EngineConfig config = new EngineConfig(modelPath, backend, null, null, maxTokens, null, cacheDir);
        Engine engine = new Engine(config);
        engine.initialize();
        return engine;
    }

    private void generateOnnxGenAI(PluginCall call, String modelPath, String prompt, int maxTokens, float temperature) throws Exception {
        Class<?> modelClass = Class.forName("ai.onnxruntime.genai.Model");
        Object model = modelClass.getConstructor(String.class).newInstance(modelPath);
        try {
            Object tokenizer = modelClass.getMethod("createTokenizer").invoke(model);
            Object params = modelClass.getMethod("createGeneratorParams").invoke(model);
            Class<?> paramsClass = Class.forName("ai.onnxruntime.genai.GeneratorParams");
            Method setInput = paramsClass.getMethod("setInput", Class.forName("ai.onnxruntime.genai.Sequences"));
            Object tokens = tokenizer.getClass().getMethod("encode", String.class).invoke(tokenizer, prompt);
            setInput.invoke(params, tokens);
            try { paramsClass.getMethod("setSearchOption", String.class, double.class).invoke(params, "max_length", (double)maxTokens); } catch (Throwable ignored) {}
            try { paramsClass.getMethod("setSearchOption", String.class, double.class).invoke(params, "temperature", (double)temperature); } catch (Throwable ignored) {}
            Object output = modelClass.getMethod("generate", paramsClass).invoke(model, params);
            int[] sequence = (int[]) output.getClass().getMethod("getSequence", long.class).invoke(output, 0L);
            String text = String.valueOf(tokenizer.getClass().getMethod("decode", int[].class).invoke(tokenizer, (Object)sequence));
            resolveText(call, text, "onnxruntime-genai", "");
        } finally {
            try { modelClass.getMethod("close").invoke(model); } catch (Throwable ignored) {}
        }
    }

    private static void resolveText(PluginCall call, String text, String provider, String stats) {
        if (text == null || text.trim().isEmpty()) { call.reject("Runtime پاسخ خالی برگرداند."); return; }
        JSObject out = new JSObject(); out.put("text", text.trim()); out.put("provider", provider); if (stats != null && !stats.isEmpty()) out.put("stats", stats); call.resolve(out);
    }

    private static boolean classExists(String name) { try { Class.forName(name); return true; } catch (Throwable ignored) { return false; } }
    private static boolean onnxRuntimeAvailable() { try { OrtEnvironment.getEnvironment(); return true; } catch (Throwable ignored) { return false; } }

    @Override protected void handleOnDestroy() {
        synchronized (execuTorchModels) { for (LlmModule m : execuTorchModels.values()) { try { m.close(); } catch (Throwable ignored) {} } execuTorchModels.clear(); }
        executor.shutdownNow(); super.handleOnDestroy();
    }
}
