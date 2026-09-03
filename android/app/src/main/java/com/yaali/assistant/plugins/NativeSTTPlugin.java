package com.yaali.assistant.plugins;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;

@CapacitorPlugin(name="NativeSTT")
public class NativeSTTPlugin extends Plugin {
    private SpeechRecognizer recognizer;
    private PluginCall pendingCall;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private Runnable timeoutTask;

    @PluginMethod
    public void listen(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            call.reject("RECORD_AUDIO permission is required");
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("No Android speech recognition service is installed or enabled");
            return;
        }
        if (pendingCall != null) {
            call.reject("Speech recognizer is already listening");
            return;
        }

        final String lang = call.getString("lang", "fa-IR");
        pendingCall = call;
        ensureRecognizer();

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "یا علی — صحبت کنید");

        try {
            recognizer.startListening(intent);
            timeoutTask = () -> finishError("Speech recognition timed out; please try again");
            mainHandler.postDelayed(timeoutTask, 30000L);
        } catch (Exception e) {
            finishError("Cannot start speech recognition: " + e.getMessage());
        }
    }

    private void ensureRecognizer() {
        if (recognizer != null) return;
        boolean useOnDevice = Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
        try {
            recognizer = useOnDevice
                ? SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext())
                : SpeechRecognizer.createSpeechRecognizer(getContext());
        } catch (Exception e) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
        }
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(android.os.Bundle params) {}
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}
            @Override public void onPartialResults(android.os.Bundle partialResults) {}
            @Override public void onEvent(int eventType, android.os.Bundle params) {}
            @Override public void onError(int error) { finishError(errorMessage(error)); }
            @Override public void onResults(android.os.Bundle results) {
                ArrayList<String> values = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (values == null || values.isEmpty() || values.get(0) == null || values.get(0).trim().isEmpty()) {
                    finishError("No speech recognized");
                    return;
                }
                clearPendingTimer();
                PluginCall call = pendingCall;
                pendingCall = null;
                JSObject out = new JSObject();
                out.put("text", values.get(0).trim());
                JSArray alternatives = new JSArray();
                for (String value : values) alternatives.put(value);
                out.put("alternatives", alternatives);
                call.resolve(out);
            }
        });
    }

    private String errorMessage(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO: return "Microphone/audio recording error";
            case SpeechRecognizer.ERROR_CLIENT: return "Speech recognizer client error";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "Microphone permission was denied";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED: return "Selected speech language is not supported";
            case SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE: return "Selected speech language is not installed on the device";
            case SpeechRecognizer.ERROR_NETWORK: return "Speech service needs network access and the network request failed";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "Speech service network timeout";
            case SpeechRecognizer.ERROR_NO_MATCH: return "No speech was recognized";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "Speech recognizer is busy";
            case SpeechRecognizer.ERROR_SERVER: return "Speech recognition server error";
            case SpeechRecognizer.ERROR_SERVER_DISCONNECTED: return "Speech recognition service disconnected";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "No speech was detected before timeout";
            default: return "Speech recognition failed (error " + error + ")";
        }
    }

    private void finishError(String message) {
        clearPendingTimer();
        if (recognizer != null) {
            try { recognizer.cancel(); } catch (Exception ignored) {}
        }
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call != null) call.reject(message);
    }

    private void clearPendingTimer() {
        if (timeoutTask != null) {
            mainHandler.removeCallbacks(timeoutTask);
            timeoutTask = null;
        }
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject out = new JSObject();
        boolean service = SpeechRecognizer.isRecognitionAvailable(getContext());
        boolean onDevice = Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());
        out.put("available", service);
        out.put("onDeviceAvailable", onDevice);
        call.resolve(out);
    }

    @Override
    protected void handleOnDestroy() {
        clearPendingTimer();
        if (recognizer != null) {
            try { recognizer.cancel(); } catch (Exception ignored) {}
            recognizer.destroy();
            recognizer = null;
        }
        pendingCall = null;
        super.handleOnDestroy();
    }
}
