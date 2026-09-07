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
import com.google.ai.edge.litertlm.Conversation;
import com.google.ai.edge.litertlm.ConversationConfig;
import com.google.ai.edge.litertlm.Engine;
import com.google.ai.edge.litertlm.EngineConfig;

import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import ai.onnxruntime.OrtEnvironment;

@CapacitorPlugin(name = "EdgeAI")
public class EdgeAIRuntimePlugin extends Plugin {

    private final ExecutorService executor =
            Executors.newSingleThreadExecutor();

    private final Map<String, LlmModule> execuTorchModels =
            new HashMap<>();

    @PluginMethod
    public void capabilities(PluginCall call) {
        JSObject out = new JSObject();

        out.put("native", true);
        out.put(
                "executorch",
                classExists(
                        "org.pytorch.executorch.extension.llm.LlmModule"
                )
        );
        out.put(
                "litertLmGeneration",
                classExists(
                        "com.google.ai.edge.litertlm.Conversation"
                )
        );
        out.put("onnxRuntime", onnxRuntimeAvailable());
        out.put(
                "onnxGenAI",
                classExists("ai.onnxruntime.genai.Model")
        );
        out.put(
                "litertLm",
                classExists(
                        "com.google.ai.edge.litertlm.Engine"
                )
        );
        out.put("version", "0.6.1-edge-runtime");

        call.resolve(out);
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject out = new JSObject();

        out.put("native", true);
        out.put("executorchLoaded", execuTorchModels.size());
        out.put("onnxRuntime", onnxRuntimeAvailable());
        out.put(
                "onnxGenAI",
                classExists("ai.onnxruntime.genai.Model")
        );
        out.put(
                "litertLm",
                classExists(
                        "com.google.ai.edge.litertlm.Engine"
                )
        );
        out.put(
                "executorch",
                classExists(
                        "org.pytorch.executorch.extension.llm.LlmModule"
                )
        );

        call.resolve(out);
    }

    @PluginMethod
    public void generate(PluginCall call) {
        final String runtime =
                call.getString("runtime", "");

        final String modelPath =
                call.getString("modelPath", "");

        final String prompt =
                call.getString("prompt", "");

        final String tokenizerPath =
                call.getString("tokenizerPath", "");

        final int maxTokens =
                Math.max(
                        64,
                        Math.min(
                                2048,
                                call.getInt("maxTokens", 512)
                        )
                );

        final float temperature =
                (float) Math.max(
                        0.05,
                        Math.min(
                                1.5,
                                call.getDouble(
                                        "temperature",
                                        0.65
                                )
                        )
                );

        if (modelPath.isEmpty() || prompt.isEmpty()) {
            call.reject(
                    "modelPath و prompt الزامی هستند."
            );
            return;
        }

        executor.execute(() -> {
            try {
                if ("executorch".equals(runtime)) {

                    generateExecuTorch(
                            call,
                            modelPath,
                            tokenizerPath,
                            prompt,
                            maxTokens,
                            temperature
                    );

                } else if ("onnx-genai".equals(runtime)) {

                    generateOnnxGenAI(
                            call,
                            modelPath,
                            prompt,
                            maxTokens,
                            temperature
                    );

                } else if ("litert-lm".equals(runtime)) {

                    generateLiteRtLm(
                            call,
                            modelPath,
                            prompt,
                            maxTokens
                    );

                } else {

                    call.reject(
                            "Runtime ناشناخته: " + runtime
                    );
                }

            } catch (Throwable e) {

                call.reject(
                        "Edge runtime failed: "
                                + (
                                e.getMessage() == null
                                        ? e.toString()
                                        : e.getMessage()
                        )
                );
            }
        });
    }

    private void generateExecuTorch(
            PluginCall call,
            String modelPath,
            String tokenizerPath,
            String prompt,
            int maxTokens,
            float temperature
    ) throws Exception {

        if (tokenizerPath == null ||
                tokenizerPath.isEmpty()) {

            throw new IllegalArgumentException(
                    "برای PTE مسیر tokenizer.model را نیز مشخص کنید."
            );
        }

        final LlmModule module;

        synchronized (execuTorchModels) {

            if (execuTorchModels.containsKey(modelPath)) {

                module =
                        execuTorchModels.get(modelPath);

            } else {

                module =
                        new LlmModule(
                                LlmModule.MODEL_TYPE_TEXT,
                                modelPath,
                                tokenizerPath,
                                temperature
                        );

                execuTorchModels.put(
                        modelPath,
                        module
                );
            }
        }

        /*
         * ExecuTorch 1.4.0:
         *
         * LlmModule.load() returns void.
         *
         * The previous implementation expected an integer
         * status code, which is not part of the current API.
         */
        try {
            module.load();
        } catch (NoSuchMethodError ignored) {
            // Compatibility with older implementations.
        }

        final StringBuilder text =
                new StringBuilder();

        final boolean[] resolved =
                {false};

        LlmGenerationConfig config =
                LlmGenerationConfig.create()
                        .seqLen(
                                Math.max(
                                        256,
                                        Math.min(
                                                4096,
                                                maxTokens + 256
                                        )
                                )
                        )
                        .maxNewTokens(maxTokens)
                        .temperature(temperature)
                        .echo(false)
                        .build();

        module.generate(
                prompt,
                config,
                new LlmCallback() {

                    @Override
                    public void onResult(String token) {

                        if (token != null) {
                            text.append(token);
                        }
                    }

                    @Override
                    public void onStats(
                            String statsJson
                    ) {

                        if (resolved[0]) {
                            return;
                        }

                        resolved[0] = true;

                        resolveText(
                                call,
                                text.toString(),
                                "executorch",
                                statsJson
                        );

                        try {
                            module.close();
                        } catch (Throwable ignored) {
                        }

                        synchronized (
                                execuTorchModels
                        ) {
                            execuTorchModels.remove(
                                    modelPath
                            );
                        }
                    }

                    @Override
                    public void onError(
                            int errorCode,
                            String message
                    ) {

                        if (resolved[0]) {
                            return;
                        }

                        resolved[0] = true;

                        try {
                            module.close();
                        } catch (Throwable ignored) {
                        }

                        synchronized (
                                execuTorchModels
                        ) {
                            execuTorchModels.remove(
                                    modelPath
                            );
                        }

                        call.reject(
                                "ExecuTorch "
                                        + errorCode
                                        + ": "
                                        + message
                        );
                    }
                }
        );
    }

    private void generateLiteRtLm(
            PluginCall call,
            String modelPath,
            String prompt,
            int maxTokens
    ) throws Exception {

        final String backendName =
                call.getString("backend", "CPU");

        final String cacheDir =
                getContext()
                        .getCacheDir()
                        .getAbsolutePath();

        Backend backend;

        if ("GPU".equalsIgnoreCase(
                backendName
        )) {

            backend = new Backend.GPU();

        } else if ("NPU".equalsIgnoreCase(
                backendName
        )) {

            backend =
                    new Backend.NPU(
                            getContext()
                                    .getApplicationInfo()
                                    .nativeLibraryDir
                    );

        } else {

            backend = new Backend.CPU();
        }

        EngineConfig config =
                new EngineConfig(
                        modelPath,
                        backend,
                        null,
                        null,
                        maxTokens,
                        null,
                        cacheDir
                );

        Engine engine =
                new Engine(config);

        Conversation conversation =
                null;

        try {

            engine.initialize();

            /*
             * LiteRT-LM requires ConversationConfig
             * in the current API.
             */
            conversation =
                    engine.createConversation(
                            new ConversationConfig()
                    );

            final long started =
                    System.currentTimeMillis();

            Object message =
                    conversation.sendMessage(
                            prompt
                    );

            String text;

            try {

                Method render =
                        conversation
                                .getClass()
                                .getMethod(
                                        "renderMessageIntoString",
                                        message.getClass(),
                                        Map.class
                                );

                text =
                        String.valueOf(
                                render.invoke(
                                        conversation,
                                        message,
                                        new HashMap<
                                                String,
                                                Object
                                                >()
                                )
                        );

            } catch (NoSuchMethodException ignored) {

                text =
                        String.valueOf(message);
            }

            text =
                    text == null
                            ? ""
                            : text.trim();

            if (text.isEmpty()) {

                throw new IllegalStateException(
                        "LiteRT-LM returned an empty response"
                );
            }

            resolveText(
                    call,
                    text,
                    "litert-lm",
                    "{\"elapsedMs\":"
                            + (
                            System.currentTimeMillis()
                                    - started
                    )
                            + ",\"backend\":\""
                            + backendName
                            + "\"}"
            );

        } finally {

            if (conversation != null) {

                try {
                    conversation.close();
                } catch (Throwable ignored) {
                }
            }

            try {
                engine.close();
            } catch (Throwable ignored) {
            }
        }
    }

    private void generateOnnxGenAI(
            PluginCall call,
            String modelPath,
            String prompt,
            int maxTokens,
            float temperature
    ) throws Exception {

        Class<?> modelClass =
                Class.forName(
                        "ai.onnxruntime.genai.Model"
                );

        Class<?> tokenizerClass =
                Class.forName(
                        "ai.onnxruntime.genai.Tokenizer"
                );

        Class<?> paramsClass =
                Class.forName(
                        "ai.onnxruntime.genai.GeneratorParams"
                );

        Class<?> generatorClass =
                Class.forName(
                        "ai.onnxruntime.genai.Generator"
                );

        Object model =
                modelClass
                        .getConstructor(String.class)
                        .newInstance(modelPath);

        Object tokenizer = null;
        Object params = null;
        Object generator = null;
        Object sequences = null;

        try {

            tokenizer =
                    tokenizerClass
                            .getConstructor(modelClass)
                            .newInstance(model);

            sequences =
                    tokenizerClass
                            .getMethod(
                                    "encode",
                                    String.class
                            )
                            .invoke(
                                    tokenizer,
                                    prompt
                            );

            params =
                    paramsClass
                            .getConstructor(modelClass)
                            .newInstance(model);

            try {

                paramsClass
                        .getMethod(
                                "setSearchOption",
                                String.class,
                                double.class
                        )
                        .invoke(
                                params,
                                "max_length",
                                (double)
                                        Math.max(
                                                64,
                                                maxTokens
                                        )
                        );

            } catch (NoSuchMethodException e) {

                paramsClass
                        .getMethod(
                                "setSearchOption",
                                String.class,
                                long.class
                        )
                        .invoke(
                                params,
                                "max_length",
                                (long)
                                        Math.max(
                                                64,
                                                maxTokens
                                        )
                        );
            }

            try {

                paramsClass
                        .getMethod(
                                "setSearchOption",
                                String.class,
                                double.class
                        )
                        .invoke(
                                params,
                                "temperature",
                                (double)
                                        temperature
                        );

            } catch (Throwable ignored) {
            }

            paramsClass
                    .getMethod(
                            "setInputSequences",
                            sequences.getClass()
                    )
                    .invoke(
                            params,
                            sequences
                    );

            generator =
                    generatorClass
                            .getConstructor(
                                    modelClass,
                                    paramsClass
                            )
                            .newInstance(
                                    model,
                                    params
                            );

            StringBuilder text =
                    new StringBuilder();

            Method isDone =
                    generatorClass.getMethod(
                            "isDone"
                    );

            Method generateNextToken =
                    generatorClass.getMethod(
                            "generateNextToken"
                    );

            Method getSequence =
                    generatorClass.getMethod(
                            "getSequence",
                            int.class
                    );

            Method decode =
                    tokenizerClass.getMethod(
                            "decode",
                            getSequence.getReturnType()
                    );

            while (!Boolean.TRUE.equals(
                    isDone.invoke(generator)
            )) {

                generateNextToken.invoke(
                        generator
                );

                Object outputSeq =
                        getSequence.invoke(
                                generator,
                                0
                        );

                String piece =
                        String.valueOf(
                                decode.invoke(
                                        tokenizer,
                                        outputSeq
                                )
                        );

                text.setLength(0);
                text.append(piece);
            }

            resolveText(
                    call,
                    text.toString(),
                    "onnxruntime-genai",
                    ""
            );

        } finally {

            closeQuietly(generator);
            closeQuietly(params);
            closeQuietly(sequences);
            closeQuietly(tokenizer);
            closeQuietly(model);
        }
    }

    private static void closeQuietly(
            Object value
    ) {

        if (value == null) {
            return;
        }

        try {

            value.getClass()
                    .getMethod("close")
                    .invoke(value);

        } catch (Throwable ignored) {
        }
    }

    private static void resolveText(
            PluginCall call,
            String text,
            String provider,
            String stats
    ) {

        if (text == null ||
                text.trim().isEmpty()) {

            call.reject(
                    "Runtime پاسخ خالی برگرداند."
            );

            return;
        }

        JSObject out =
                new JSObject();

        out.put(
                "text",
                text.trim()
        );

        out.put(
                "provider",
                provider
        );

        if (stats != null &&
                !stats.isEmpty()) {

            out.put(
                    "stats",
                    stats
            );
        }

        call.resolve(out);
    }

    private static boolean classExists(
            String name
    ) {

        try {

            Class.forName(name);
            return true;

        } catch (Throwable ignored) {

            return false;
        }
    }

    private static boolean onnxRuntimeAvailable() {

        try {

            OrtEnvironment.getEnvironment();
            return true;

        } catch (Throwable ignored) {

            return false;
        }
    }

    @Override
    protected void handleOnDestroy() {

        synchronized (execuTorchModels) {

            for (LlmModule module :
                    execuTorchModels.values()) {

                try {
                    module.close();
                } catch (Throwable ignored) {
                }
            }

            execuTorchModels.clear();
        }

        executor.shutdownNow();

        super.handleOnDestroy();
    }
}
