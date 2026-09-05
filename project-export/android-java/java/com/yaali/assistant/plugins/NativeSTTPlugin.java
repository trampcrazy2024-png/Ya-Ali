package com.yaali.assistant.plugins;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import androidx.activity.result.ActivityResult;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;

/**
 * Stable Android STT bridge.
 *
 * The previous implementation used SpeechRecognizer directly. Some OEM
 * recognition services can crash or misbehave inside the host process even
 * when the API reports that they are available. For a production app the
 * safer path is Android's recognition activity: the speech service runs in
 * its own system/provider process and returns a normal ActivityResult.
 * EXTRA_PREFER_OFFLINE remains enabled so a device with an offline language
 * pack can use it, without forcing an unavailable offline engine.
 */
@CapacitorPlugin(name = "NativeSTT")
public class NativeSTTPlugin extends Plugin {
    private PluginCall pendingCall;
    private String pendingLanguage = "fa-IR";
    private boolean cancelled = false;

    @PluginMethod
    public void listen(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("مجوز میکروفن داده نشده است. در تنظیمات Android دسترسی Microphone را فعال کنید.");
            return;
        }
        if (pendingCall != null) {
            call.reject("تشخیص گفتار دیگری در حال اجراست.");
            return;
        }

        boolean available;
        try {
            available = SpeechRecognizer.isRecognitionAvailable(getContext());
        } catch (Throwable ignored) {
            available = false;
        }
        if (!available) {
            call.reject("هیچ سرویس تشخیص گفتار Android روی این دستگاه در دسترس نیست. Google Speech یا سرویس گفتار سیستم را فعال کنید.");
            return;
        }

        pendingCall = call;
        cancelled = false;
        pendingLanguage = call.getString("lang", "fa-IR");
        try {
            Intent intent = buildIntent(pendingLanguage);
            startActivityForResult(call, intent, "speechResult");
        } catch (Throwable e) {
            pendingCall = null;
            call.reject("اجرای صفحه تشخیص گفتار Android ناموفق بود: " + safeMessage(e));
        }
    }

    private Intent buildIntent(String lang) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "یا علی — صحبت کنید");
        // This is a preference, not a hard requirement. The installed speech
        // service may fall back to its normal mode if no offline pack exists.
        intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        return intent;
    }

    @ActivityCallback
    private void speechResult(PluginCall call, ActivityResult result) {
        if (pendingCall == call) pendingCall = null;
        if (call == null || cancelled) return;

        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("تشخیص گفتار لغو شد یا سرویس گفتار نتیجه‌ای برنگرداند.");
            return;
        }

        ArrayList<String> values = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if (values == null || values.isEmpty() || values.get(0) == null || values.get(0).trim().isEmpty()) {
            call.reject("هیچ گفتاری تشخیص داده نشد.");
            return;
        }

        JSObject out = new JSObject();
        out.put("text", values.get(0).trim());
        out.put("mode", "system-activity");
        out.put("language", pendingLanguage);
        JSArray alternatives = new JSArray();
        for (String value : values) {
            if (value != null && !value.trim().isEmpty()) alternatives.put(value.trim());
        }
        out.put("alternatives", alternatives);
        call.resolve(out);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        // The system recognition activity owns its own lifecycle. Finishing
        // it through an arbitrary Activity reference is OEM-dependent and can
        // reintroduce the crash this plugin is designed to prevent. The UI can
        // simply await the activity result; a cancelled result is handled above.
        PluginCall pending = pendingCall;
        cancelled = true;
        pendingCall = null;
        if (pending != null) pending.reject("تشخیص گفتار متوقف شد.");
        call.resolve();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean service = false;
        boolean onDevice = false;
        try { service = SpeechRecognizer.isRecognitionAvailable(getContext()); } catch (Throwable ignored) {}
        try {
            onDevice = Build.VERSION.SDK_INT >= 31
                    && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
        } catch (Throwable ignored) {}
        JSObject out = new JSObject();
        out.put("available", service || onDevice);
        out.put("serviceAvailable", service);
        out.put("onDeviceAvailable", onDevice);
        out.put("api", Build.VERSION.SDK_INT);
        call.resolve(out);
    }

    @Override
    protected void handleOnDestroy() {
        PluginCall pending = pendingCall;
        cancelled = true;
        pendingCall = null;
        if (pending != null) pending.reject("تشخیص گفتار متوقف شد.");
        super.handleOnDestroy();
    }

    private String safeMessage(Throwable e) {
        String message = e == null ? null : e.getMessage();
        return message == null || message.isEmpty() ? e.getClass().getSimpleName() : message;
    }
}
