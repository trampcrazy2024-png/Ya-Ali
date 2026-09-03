package com.yaali.assistant.plugins;

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
        else Log.i(TAG, message);
        call.resolve();
    }

    @PluginMethod
    public void getLogcat(PluginCall call) {
        StringBuilder out = new StringBuilder();
        try {
            Process p = Runtime.getRuntime().exec(new String[]{"logcat", "-d", "-v", "threadtime"});
            BufferedReader r = new BufferedReader(new InputStreamReader(p.getInputStream()));
            String line; int count = 0;
            while ((line = r.readLine()) != null && count++ < 2000) {
                line = redact(line);
                out.append(line).append('\n');
            }
            r.close();
            p.destroy();
        } catch (Exception e) {
            out.append("logcat unavailable: ").append(e.getMessage());
        }
        JSObject ret = new JSObject(); ret.put("text", out.toString()); call.resolve(ret);
    }

    private String redact(String line) {
        return line.replaceAll("(?i)(authorization\\s*[:=]\\s*bearer\\s+)[^\\s]+", "$1[REDACTED]")
                .replaceAll("(?i)(api[_-]?key\\s*[:=]\\s*)[^\\s,]+", "$1[REDACTED]")
                .replaceAll("(?i)(password|token|secret)\\s*[:=]\\s*[^\\s,]+", "$1=[REDACTED]");
    }
}
