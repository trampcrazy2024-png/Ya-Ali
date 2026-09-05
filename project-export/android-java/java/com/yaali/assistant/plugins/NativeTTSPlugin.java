package com.yaali.assistant.plugins;

import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "NativeTTS")
public class NativeTTSPlugin extends Plugin {
    private TextToSpeech tts;
    private boolean ready = false;

    @Override public void load() {
        super.load();
        tts = new TextToSpeech(getContext(), status -> ready = status == TextToSpeech.SUCCESS);
    }

    @PluginMethod public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String requested = call.getString("lang", "en-US");
        double rate = call.getDouble("rate", 0.95);
        double pitch = call.getDouble("pitch", 1.0);
        if (text == null || text.trim().isEmpty()) { call.reject("TTS text is empty"); return; }
        if (!ready || tts == null) { call.reject("Android TTS is not ready"); return; }

        Locale locale = Locale.forLanguageTag(requested.replace('_', '-'));
        int result = tts.setLanguage(locale);
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            if (requested.toLowerCase(Locale.ROOT).startsWith("en")) {
                result = tts.setLanguage(Locale.US);
                if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) result = tts.setLanguage(Locale.ENGLISH);
            } else if (requested.toLowerCase(Locale.ROOT).startsWith("ar")) {
                result = tts.setLanguage(new Locale("ar"));
            }
        }
        if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
            call.reject("TTS language is not supported on this device: " + requested);
            return;
        }
        tts.setSpeechRate((float)Math.max(0.1, Math.min(3.0, rate)));
        tts.setPitch((float)Math.max(0.1, Math.min(2.0, pitch)));
        String utteranceId = UUID.randomUUID().toString();
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) {}
            @Override public void onDone(String id) { if (utteranceId.equals(id)) { JSObject out=new JSObject(); out.put("ok",true); call.resolve(out); } }
            @Override public void onError(String id) { if (utteranceId.equals(id)) call.reject("Android TTS failed"); }
        });
        if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId) == TextToSpeech.ERROR) call.reject("Android TTS failed to start");
    }

    @PluginMethod public void isLanguageAvailable(PluginCall call) {
        String lang = call.getString("lang", "en-US");
        JSObject out = new JSObject();
        if (!ready || tts == null) { out.put("available", false); out.put("status", "not-ready"); call.resolve(out); return; }
        Locale locale = Locale.forLanguageTag(lang.replace('_','-'));
        int r = tts.isLanguageAvailable(locale);
        out.put("available", r >= TextToSpeech.LANG_AVAILABLE);
        out.put("status", r);
        call.resolve(out);
    }

    @PluginMethod public void stop(PluginCall call) { if (tts != null) tts.stop(); call.resolve(); }

    @Override protected void handleOnDestroy() { if (tts != null) { tts.stop(); tts.shutdown(); tts=null; } super.handleOnDestroy(); }
}
