package com.yaali.assistant;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Build;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.yaali.assistant.plugins.DiagnosticsPlugin;
import com.yaali.assistant.plugins.EdgeAIRuntimePlugin;
import com.yaali.assistant.plugins.LocalAIPlugin;
import com.yaali.assistant.plugins.NativeSTTPlugin;
import com.yaali.assistant.plugins.NativeTTSPlugin;
import com.yaali.assistant.plugins.SecureStoragePlugin;

public class MainActivity extends BridgeActivity {
    private static final int RC_AUDIO = 6001;
    private long lastBackAt = 0L;
    private final OnBackInvokedCallback predictiveBackCallback = this::handleBack;

    @Override public void onCreate(Bundle state) {
        registerPlugin(NativeTTSPlugin.class);
        registerPlugin(DiagnosticsPlugin.class);
        registerPlugin(EdgeAIRuntimePlugin.class);
        registerPlugin(LocalAIPlugin.class);
        registerPlugin(NativeSTTPlugin.class);
        registerPlugin(SecureStoragePlugin.class);
        super.onCreate(state);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, predictiveBackCallback);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, RC_AUDIO);
        }
    }

    private void handleBack() {
        long now = System.currentTimeMillis();
        if (now - lastBackAt < 2200L) { finish(); return; }
        lastBackAt = now;
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('yaaliBack'))", null);
        } else finish();
    }

    @Override public void onBackPressed() {
        if (Build.VERSION.SDK_INT < 33) { handleBack(); } else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(predictiveBackCallback);
        }
        super.onDestroy();
    }
}
