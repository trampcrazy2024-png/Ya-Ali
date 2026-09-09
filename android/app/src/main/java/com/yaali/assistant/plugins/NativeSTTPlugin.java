package com.yaali.assistant.plugins;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PermissionState;
import androidx.activity.result.ActivityResult;

import java.util.ArrayList;

/** Production STT bridge. Uses Android recognition UI first and falls back to
 * direct SpeechRecognizer when OEM recognition activities return cancellation.
 * All direct recognizer lifecycle calls are forced onto the main thread. */
@CapacitorPlugin(
    name = "NativeSTT",
    permissions = @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
)
public class NativeSTTPlugin extends Plugin {
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private PluginCall pendingCall;
    private String pendingLanguage = "fa-IR";
    private SpeechRecognizer recognizer;
    private boolean finished = false;
    private boolean directFallbackStarted = false;
    private final Runnable timeoutRunnable = () -> rejectOnce("زمان تشخیص گفتار تمام شد. دوباره تلاش کنید.");

    @PluginMethod
    public void listen(PluginCall call) {
        if (pendingCall != null) { call.reject("تشخیص گفتار دیگری در حال اجراست."); return; }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
            return;
        }
        beginListen(call);
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) beginListen(call);
        else call.reject("مجوز میکروفن داده نشده است. دسترسی Microphone را فعال کنید.");
    }

    private void beginListen(PluginCall call) {
        // Do NOT hard-reject on isRecognitionAvailable()==false anymore. On some
        // OEM ROMs / devices without the Google app this check under-reports even
        // when a usable recognizer exists, and it previously produced a dead-end
        // "not available" error the instant the mic button was pressed, before we
        // even tried. We now always attempt the system activity first; the real
        // "no recognizer on this device" case is still caught further down and
        // reported with an actionable message instead of a generic one.
        pendingCall = call; pendingLanguage = call.getString("lang", "fa-IR"); finished=false; directFallbackStarted=false;
        try { startActivityForResult(call, buildIntent(pendingLanguage), "speechResult"); }
        catch (Throwable e) { startDirectRecognizer(); }
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
        intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        return intent;
    }

    @ActivityCallback
    private void speechResult(PluginCall call, ActivityResult result) {
        if (finished || call == null || pendingCall != call) return;
        if (result != null && result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            ArrayList<String> values = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (values != null && !values.isEmpty() && values.get(0) != null && !values.get(0).trim().isEmpty()) { resolveResults(values, "system-activity"); return; }
        }
        // OEMs commonly return RESULT_CANCELED even though a direct recognizer
        // is available. Do not surface a false "cancelled" error yet.
        if (!directFallbackStarted) { directFallbackStarted=true; startDirectRecognizer(); }
        else rejectOnce("تشخیص گفتار لغو شد یا نتیجه‌ای برنگشت.");
    }

    private void startDirectRecognizer() {
        mainHandler.post(() -> {
            if (finished || pendingCall == null) return;
            boolean available = false;
            try { available = SpeechRecognizer.isRecognitionAvailable(getContext()); } catch (Throwable ignored) {}
            if (!available) {
                // Both the system recognition activity and the direct recognizer
                // path have now failed/are unavailable. This device genuinely has
                // no speech-recognition service registered (very common on Iranian
                // Android devices that ship without Google Play Services / the
                // Google app). Give the user something actionable instead of a
                // dead end: switch to the offline Sherpa-ONNX model from Settings.
                rejectOnce("این گوشی هیچ سرویس تشخیص گفتار سیستمی ندارد (معمولاً به دلیل نبود Google App). برای استفاده از میکروفن، یک «مدل گفتار آفلاین (Sherpa-ONNX STT)» را از بخش تنظیمات ← Audio Core نصب کنید؛ یا فعلاً پیام را تایپ کنید.");
                return;
            }
            try {
                destroyRecognizer();
                recognizer = (Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext()))
                    ? SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext())
                    : SpeechRecognizer.createSpeechRecognizer(getContext());
                recognizer.setRecognitionListener(new RecognitionListener() {
                    @Override public void onReadyForSpeech(android.os.Bundle p) {}
                    @Override public void onBeginningOfSpeech() {}
                    @Override public void onRmsChanged(float rms) {}
                    @Override public void onBufferReceived(byte[] b) {}
                    @Override public void onEndOfSpeech() {}
                    @Override public void onPartialResults(android.os.Bundle p) {}
                    @Override public void onEvent(int t, android.os.Bundle p) {}
                    @Override public void onError(int error) {
                        mainHandler.post(() -> {
                            if (finished) return;
                            String message = errorMessage(error);
                            if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) rejectOnce(message);
                            else rejectOnce(message);
                        });
                    }
                    @Override public void onResults(android.os.Bundle results) {
                        ArrayList<String> values = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        if (values == null || values.isEmpty() || values.get(0) == null || values.get(0).trim().isEmpty()) rejectOnce("گفتاری تشخیص داده نشد.");
                        else resolveResults(values, "direct-recognizer");
                    }
                });
                recognizer.startListening(buildIntent(pendingLanguage));
                mainHandler.removeCallbacks(timeoutRunnable);
                mainHandler.postDelayed(timeoutRunnable, 30000);
            } catch (Throwable e) { rejectOnce("اجرای تشخیص گفتار ناموفق بود: " + safeMessage(e)); }
        });
    }

    private void resolveResults(ArrayList<String> values, String mode) {
        if (finished) return; finished=true; mainHandler.removeCallbacks(timeoutRunnable); PluginCall call=pendingCall; pendingCall=null;
        mainHandler.post(() -> {
            destroyRecognizer();
            if (call == null) return;
            JSObject out=new JSObject(); out.put("text",values.get(0).trim()); out.put("mode",mode); out.put("language",pendingLanguage);
            JSArray alternatives=new JSArray(); for(String v:values) if(v!=null&&!v.trim().isEmpty()) alternatives.put(v.trim()); out.put("alternatives",alternatives); call.resolve(out);
        });
    }

    private void rejectOnce(String message) {
        if (finished) return; finished=true; mainHandler.removeCallbacks(timeoutRunnable); PluginCall call=pendingCall; pendingCall=null;
        mainHandler.post(() -> { destroyRecognizer(); if(call!=null) call.reject(message); });
    }

    @PluginMethod
    public void stop(PluginCall call) { rejectOnce("تشخیص گفتار متوقف شد."); if(call!=null && pendingCall==null) call.resolve(); }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean service=false,onDevice=false; try{service=SpeechRecognizer.isRecognitionAvailable(getContext());}catch(Throwable ignored){}
        try{onDevice=Build.VERSION.SDK_INT>=31&&SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext());}catch(Throwable ignored){}
        JSObject out=new JSObject();out.put("available",service||onDevice);out.put("serviceAvailable",service);out.put("onDeviceAvailable",onDevice);out.put("api",Build.VERSION.SDK_INT);call.resolve(out);
    }

    private void destroyRecognizer(){ mainHandler.post(() -> { if(recognizer!=null){try{recognizer.cancel();}catch(Throwable ignored){} try{recognizer.destroy();}catch(Throwable ignored){} recognizer=null;} }); }
    @Override protected void handleOnDestroy(){ rejectOnce("تشخیص گفتار متوقف شد."); mainHandler.removeCallbacksAndMessages(null); super.handleOnDestroy(); }
    private String errorMessage(int e){ switch(e){case SpeechRecognizer.ERROR_AUDIO:return "خطای میکروفن یا ورودی صوتی.";case SpeechRecognizer.ERROR_CLIENT:return "خطای داخلی تشخیص گفتار.";case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:return "مجوز میکروفن کافی نیست.";case SpeechRecognizer.ERROR_NETWORK:return "شبکه تشخیص گفتار در دسترس نیست.";case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:return "زمان ارتباط با سرویس گفتار تمام شد.";case SpeechRecognizer.ERROR_NO_MATCH:return "گفتاری تشخیص داده نشد.";case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:return "سرویس تشخیص گفتار مشغول است.";case SpeechRecognizer.ERROR_SERVER:return "سرویس تشخیص گفتار خطای سرور داد.";case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:return "صدایی دریافت نشد.";default:return "تشخیص گفتار ناموفق بود. کد خطا: "+e;} }
    private String safeMessage(Throwable e){String m=e==null?null:e.getMessage();return m==null||m.isEmpty()?e.getClass().getSimpleName():m;}
}
