package com.yaali.assistant.plugins;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.database.Cursor;
import android.provider.OpenableColumns;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "LocalAI")
public class LocalAIPlugin extends Plugin {
    private static final String TAG = "YaAli-LocalAI";
    private static final String MODEL_DIR = "models";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private File loadedModel;
    private boolean engineReady = false;
    private boolean generating = false;
    private String engineError = "";

    static {
        try {
            System.loadLibrary("yaali_llama_jni");
        } catch (Throwable ignored) {
            // status() exposes the actual native availability to the UI.
        }
    }

    private static native String nativeLoadModel(String path, int context, int threads);
    private static native String nativeGenerate(String prompt, int maxTokens, float temperature);
    private static native void nativeUnloadModel();
    private static native String nativeStatus();

    @PluginMethod
    public void pickModel(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/octet-stream");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/octet-stream", "application/*", "*/*"});
        startActivityForResult(call, intent, "modelPicked");
    }

    @ActivityCallback
    private void modelPicked(PluginCall call, ActivityResult result) {
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.reject("Model selection cancelled");
            return;
        }
        Uri uri = result.getData().getData();
        try { getContext().getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Exception ignored) {}
        try {
            File dest = copyUri(uri);
            JSObject r = new JSObject();
            r.put("path", dest.getAbsolutePath());
            r.put("name", dest.getName());
            r.put("sizeBytes", dest.length());
            r.put("imported", true);
            r.put("engineReady", false);
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Cannot import model: " + e.getMessage());
        }
    }

    private File copyUri(Uri uri) throws Exception {
        String name = "model.gguf";
        Cursor c = getContext().getContentResolver().query(uri, null, null, null, null);
        if (c != null) {
            try {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0 && c.moveToFirst() && c.getString(i) != null) name = c.getString(i);
            } finally { c.close(); }
        }
        if (!name.toLowerCase().endsWith(".gguf")) throw new IOException("Only GGUF models are supported for on-device inference");
        File dir = new File(getContext().getFilesDir(), MODEL_DIR);
        if (!dir.exists() && !dir.mkdirs()) throw new IOException("cannot create models directory");
        File dest = new File(dir, name);
        try (InputStream in = getContext().getContentResolver().openInputStream(uri);
             FileOutputStream out = new FileOutputStream(dest)) {
            if (in == null) throw new IOException("cannot open selected file");
            byte[] b = new byte[1024 * 1024];
            int n;
            while ((n = in.read(b)) != -1) out.write(b, 0, n);
        }
        return dest;
    }

    @PluginMethod
    public void listModels(PluginCall call) {
        File dir = new File(getContext().getFilesDir(), MODEL_DIR);
        JSArray arr = new JSArray();
        if (dir.isDirectory()) {
            File[] files = dir.listFiles((d, n) -> n != null && n.toLowerCase().endsWith(".gguf"));
            if (files != null) {
                java.util.Arrays.sort(files, (a, b) -> a.getName().compareToIgnoreCase(b.getName()));
                for (File f : files) {
                    JSObject item = new JSObject();
                    item.put("path", f.getAbsolutePath());
                    item.put("name", f.getName());
                    item.put("sizeBytes", f.length());
                    item.put("loaded", loadedModel != null && f.equals(loadedModel) && engineReady);
                    arr.put(item);
                }
            }
        }
        JSObject out = new JSObject();
        out.put("models", arr);
        call.resolve(out);
    }

    @PluginMethod
    public void deleteModel(PluginCall call) {
        String path = call.getString("path", "");
        if (path.isEmpty()) { call.reject("path is required"); return; }
        File dir = new File(getContext().getFilesDir(), MODEL_DIR);
        File f = new File(path);
        try {
            if (!f.getCanonicalPath().startsWith(dir.getCanonicalPath() + File.separator)) {
                call.reject("Invalid model path"); return;
            }
            if (loadedModel != null && f.equals(loadedModel)) {
                nativeUnloadModel(); loadedModel = null; engineReady = false; engineError = "";
            }
            JSObject out = new JSObject();
            out.put("deleted", f.exists() && f.delete());
            call.resolve(out);
        } catch (Exception e) { call.reject("Cannot delete model: " + e.getMessage()); }
    }

    @PluginMethod
    public void loadModel(PluginCall call) {
        String path = call.getString("path", "");
        int context = Math.max(1024, Math.min(8192, call.getInt("context", 2048)));
        int threads = Math.max(1, Math.min(8, call.getInt("threads", Math.max(2, Runtime.getRuntime().availableProcessors() / 2))));
        if (path.isEmpty()) { call.reject("path is required"); return; }
        File f = new File(path);
        if (!f.exists() || !f.isFile()) { call.reject("Model not found: " + path); return; }
        if (!f.getName().toLowerCase().endsWith(".gguf")) { call.reject("Only GGUF models are supported"); return; }

        executor.execute(() -> {
            try {
                if (loadedModel != null) nativeUnloadModel();
                String error = nativeLoadModel(f.getAbsolutePath(), context, threads);
                engineError = error == null ? "" : error;
                engineReady = engineError.isEmpty();
                loadedModel = engineReady ? f : null;
                JSObject r = modelStatusObject();
                if (engineReady) r.put("loaded", true);
                call.resolve(r);
            } catch (Throwable e) {
                engineReady = false;
                engineError = e.getMessage() == null ? e.toString() : e.getMessage();
                loadedModel = null;
                call.resolve(modelStatusObject());
            }
        });
    }

    @PluginMethod
    public void unloadModel(PluginCall call) {
        executor.execute(() -> {
            try { nativeUnloadModel(); } catch (Throwable ignored) {}
            loadedModel = null;
            engineReady = false;
            engineError = "";
            call.resolve();
        });
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = modelStatusObject();
        try {
            String nativeStatus = nativeStatus();
            if (nativeStatus != null && !nativeStatus.isEmpty()) r.put("nativeStatus", nativeStatus);
        } catch (Throwable e) {
            r.put("nativeStatus", "native library unavailable: " + e.getMessage());
        }
        call.resolve(r);
    }

    @PluginMethod
    public void generate(PluginCall call) {
        if (!engineReady || loadedModel == null) {
            call.reject(engineError.isEmpty() ? "Local GGUF engine is not ready. Load a GGUF model first." : engineError);
            return;
        }
        JSArray messages = call.getArray("messages");
        String prompt = buildPrompt(messages);
        int maxTokens = Math.max(64, Math.min(1024, call.getInt("maxTokens", 384)));
        double temperature = Math.max(0.05, Math.min(1.5, call.getDouble("temperature", 0.7)));
        generating = true;
        executor.execute(() -> {
            try {
                String text = nativeGenerate(prompt, maxTokens, (float) temperature);
                if (text == null || text.trim().isEmpty()) { call.reject("Local model returned an empty response"); return; }
                JSObject out = new JSObject();
                out.put("text", text.trim());
                out.put("provider", "local-llama.cpp");
                call.resolve(out);
            } catch (Throwable e) {
                call.reject("Local inference failed: " + (e.getMessage() == null ? e.toString() : e.getMessage()));
            } finally {
                generating = false;
            }
        });
    }

    private String buildPrompt(JSArray messages) {
        StringBuilder p = new StringBuilder();
        if (messages != null) {
            try {
                for (int i = 0; i < messages.length(); i++) {
                    JSObject m = new JSObject(messages.getJSONObject(i).toString());
                    String role = m == null ? "user" : m.optString("role", "user");
                    String content = m == null ? "" : m.optString("content", "");
                    if (!content.isEmpty()) p.append(role).append(":\n").append(content).append("\n\n");
                }
            } catch (Exception ignored) {}
        }
        p.append("assistant:\n");
        return p.toString();
    }

    private JSObject modelStatusObject() {
        JSObject r = new JSObject();
        r.put("loaded", loadedModel != null && engineReady);
        r.put("imported", loadedModel != null);
        r.put("engineReady", engineReady);
        r.put("generating", generating);
        if (loadedModel != null) {
            r.put("path", loadedModel.getAbsolutePath());
            r.put("name", loadedModel.getName());
            r.put("sizeBytes", loadedModel.length());
        }
        if (!engineError.isEmpty()) r.put("error", engineError);
        return r;
    }

    @Override
    protected void handleOnDestroy() {
        try { nativeUnloadModel(); } catch (Throwable ignored) {}
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
