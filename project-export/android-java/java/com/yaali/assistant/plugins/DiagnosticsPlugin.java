package com.yaali.assistant.plugins;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStreamReader;

@CapacitorPlugin(name = "Diagnostics")
public class DiagnosticsPlugin extends Plugin {
    private static final String TAG = "YaAli";

    @Override
    public void load() { Log.i(TAG, "Diagnostics plugin loaded"); }

    @PluginMethod
    public void log(PluginCall call) {
        String level = call.getString("level", "info");
        String message = call.getString("message", "");
        if ("error".equals(level)) Log.e(TAG, message);
        else if ("warn".equals(level)) Log.w(TAG, message);
        else if ("debug".equals(level)) Log.d(TAG, message);
        else Log.i(TAG, message);
        call.resolve();
    }

    @PluginMethod
    public void getLogcat(PluginCall call) {
        JSObject ret = new JSObject();
        StringBuilder out = new StringBuilder();
        Process process = null;
        try {
            // Keep the useful native diagnostic context but avoid dumping an
            // enormous amount of unrelated system logs into the WebView.
            process = Runtime.getRuntime().exec(new String[]{"logcat", "-d", "-v", "threadtime", "-t", "1200"});
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            int count = 0;
            while ((line = reader.readLine()) != null && count < 900) {
                if (isRelevant(line)) {
                    out.append(redact(line)).append('\n');
                    count++;
                }
            }
            reader.close();
            process.destroy();
            ret.put("text", out.toString());
            ret.put("lines", count);
            ret.put("hint", "این بخش برای بررسی خطاهای Native Android، STT/TTS، JNI/llama.cpp، Crash و ANR است.");
            call.resolve(ret);
        } catch (Exception e) {
            if (process != null) process.destroy();
            ret.put("text", "logcat unavailable: " + e.getMessage());
            ret.put("lines", 0);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void copyToClipboard(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.isEmpty()) { call.reject("متن برای کپی خالی است."); return; }
        try {
            ClipboardManager clipboard = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard == null) { call.reject("Clipboard Android در دسترس نیست."); return; }
            clipboard.setPrimaryClip(ClipData.newPlainText("Ya Ali Logcat", text));
            JSObject out = new JSObject(); out.put("ok", true); call.resolve(out);
        } catch (Throwable e) {
            call.reject("کپی در Clipboard Android ناموفق بود: " + (e.getMessage() == null ? e.toString() : e.getMessage()));
        }
    }

    private boolean isRelevant(String line) {
        String s = line.toLowerCase();
        return s.contains("yaali") || s.contains("androidruntime") || s.contains("fatal exception")
                || s.contains("speechrecognizer") || s.contains("recognitionservice")
                || s.contains("libc") || s.contains("signal") || s.contains("debug")
                || s.contains("llama") || s.contains("crash") || s.contains("anr");
    }

    private String redact(String line) {
        return line.replaceAll("(?i)(authorization\\s*[:=]\\s*bearer\\s+)[^\\s]+", "$1[REDACTED]")
                .replaceAll("(?i)(api[_-]?key\\s*[:=]\\s*)[^\\s,]+", "$1[REDACTED]")
                .replaceAll("(?i)(password|token|secret)\\s*[:=]\\s*[^\\s,]+", "$1=[REDACTED]");
    }
}
