package com.yaali.assistant;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.yaali.assistant.plugins.NativeTTSPlugin;
import com.yaali.assistant.plugins.DiagnosticsPlugin;
import com.yaali.assistant.plugins.LocalAIPlugin;
import com.yaali.assistant.plugins.NativeSTTPlugin;

public class MainActivity extends BridgeActivity {
    private static final int RC_AUDIO = 6001;

    @Override
    public void onCreate(Bundle state) {
        registerPlugin(NativeTTSPlugin.class);
        registerPlugin(DiagnosticsPlugin.class);
        registerPlugin(LocalAIPlugin.class);
        registerPlugin(NativeSTTPlugin.class);
        super.onCreate(state);
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.RECORD_AUDIO}, RC_AUDIO);
        }
    }
    @Override
    public void onBackPressed() {
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('yaaliBack'))", null);
        } else {
            super.onBackPressed();
        }
    }
}

