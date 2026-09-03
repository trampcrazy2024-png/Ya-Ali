package com.yaali.assistant;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.yaali.assistant.plugins.DiagnosticsPlugin;
import com.yaali.assistant.plugins.LocalAIPlugin;
import com.yaali.assistant.plugins.NativeSTTPlugin;
import com.yaali.assistant.plugins.NativeTTSPlugin;

public class MainActivity extends BridgeActivity {
    private static final int RC_AUDIO = 6001;
    private long lastBackAt = 0L;

    @Override public void onCreate(Bundle state) {
        registerPlugin(NativeTTSPlugin.class);
        registerPlugin(DiagnosticsPlugin.class);
        registerPlugin(LocalAIPlugin.class);
        registerPlugin(NativeSTTPlugin.class);
        super.onCreate(state);
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, RC_AUDIO);
        }
    }

    @Override public void onBackPressed() {
        long now = System.currentTimeMillis();
        if (now - lastBackAt < 2200L) { super.onBackPressed(); return; }
        lastBackAt = now;
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('yaaliBack'))", null);
        } else super.onBackPressed();
    }
}
