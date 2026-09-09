package com.yaali.assistant;

import android.os.Bundle;
import android.os.Build;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import com.getcapacitor.BridgeActivity;
import com.yaali.assistant.plugins.DiagnosticsPlugin;
import com.yaali.assistant.plugins.EdgeAIRuntimePlugin;
import com.yaali.assistant.plugins.LocalAIPlugin;
import com.yaali.assistant.plugins.NativeSTTPlugin;
import com.yaali.assistant.plugins.NativeTTSPlugin;
import com.yaali.assistant.plugins.SecureStoragePlugin;
import com.yaali.assistant.plugins.SherpaOnnxPlugin;

public class MainActivity extends BridgeActivity {
    private long lastBackAt = 0L;
    private final OnBackInvokedCallback predictiveBackCallback = this::handleBack;

    @Override public void onCreate(Bundle state) {
        registerPlugin(NativeTTSPlugin.class);
        registerPlugin(DiagnosticsPlugin.class);
        registerPlugin(EdgeAIRuntimePlugin.class);
        registerPlugin(LocalAIPlugin.class);
        registerPlugin(NativeSTTPlugin.class);
        registerPlugin(SecureStoragePlugin.class);
        registerPlugin(SherpaOnnxPlugin.class);
        super.onCreate(state);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, predictiveBackCallback);
        }
        // NOTE (RC1 fix): RECORD_AUDIO used to be requested here directly via
        // ActivityCompat, separately from Capacitor's own permission plugin
        // system, and its result was never handled (no onRequestPermissionsResult
        // override). That produced a mic permission dialog on first launch that
        // was disconnected from NativeSTTPlugin's own permission flow, and could
        // race with it. Permission is now requested exactly once, at the moment
        // it's actually needed, by NativeSTTPlugin itself (see listen()).
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

    @Override public void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(predictiveBackCallback);
        }
        super.onDestroy();
    }
}
