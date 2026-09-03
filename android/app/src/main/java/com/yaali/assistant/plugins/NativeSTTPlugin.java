package com.yaali.assistant.plugins;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.speech.RecognizerIntent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.PluginMethod;
import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(name="NativeSTT")
public class NativeSTTPlugin extends Plugin {
    @PluginMethod
    public void listen(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            call.reject("RECORD_AUDIO permission is required");
            return;
        }
        String lang = call.getString("lang", "fa-IR");
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Ya Ali");
        startActivityForResult(call, intent, "speechResult");
    }

    @ActivityCallback
    private void speechResult(PluginCall call, ActivityResult result) {
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("Speech recognition cancelled or unavailable"); return;
        }
        ArrayList<String> values = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (values == null || values.isEmpty()) { call.reject("No speech recognized"); return; }
        JSObject out = new JSObject();
        out.put("text", values.get(0));
        out.put("alternatives", values);
        call.resolve(out);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        JSObject out = new JSObject();
        out.put("available", getContext().getPackageManager().resolveActivity(intent, 0) != null);
        call.resolve(out);
    }
}
