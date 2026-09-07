package com.yaali.assistant.plugins;

import android.Manifest;
import android.content.pm.PackageManager;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioRecord;
import android.media.AudioTrack;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.Looper;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.k2fsa.sherpa.onnx.FeatureConfig;
import com.k2fsa.sherpa.onnx.GenerationConfig;
import com.k2fsa.sherpa.onnx.OfflineTts;
import com.k2fsa.sherpa.onnx.OfflineTtsConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig;
import com.k2fsa.sherpa.onnx.OfflineTtsVitsModelConfig;
import com.k2fsa.sherpa.onnx.OnlineModelConfig;
import com.k2fsa.sherpa.onnx.OnlineRecognizer;
import com.k2fsa.sherpa.onnx.OnlineRecognizerConfig;
import com.k2fsa.sherpa.onnx.OnlineStream;
import com.k2fsa.sherpa.onnx.OnlineTransducerModelConfig;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Ya-Ali offline speech runtime.
 *
 * Sherpa-ONNX 1.13.7 Android AAR API.
 *
 * STT:
 * Android AudioRecord -> Sherpa streaming transducer.
 *
 * TTS:
 * Sherpa offline VITS -> AudioTrack.
 *
 * Models are supplied by the caller and are never downloaded
 * implicitly by this plugin.
 */
@CapacitorPlugin(name = "SherpaOnnx")
public class SherpaOnnxPlugin extends Plugin {

    private static final int SAMPLE_RATE = 16000;

    private final ExecutorService executor =
            Executors.newSingleThreadExecutor();

    private final Handler main =
            new Handler(Looper.getMainLooper());

    private volatile OnlineRecognizer recognizer;
    private volatile OnlineStream stream;
    private volatile AudioRecord recorder;
    private volatile PluginCall activeSttCall;

    private final AtomicBoolean recording =
            new AtomicBoolean(false);

    @PluginMethod
    public void capabilities(PluginCall call) {
        JSObject out = new JSObject();

        out.put("available", true);
        out.put("stt", true);
        out.put("tts", true);
        out.put("offline", true);
        out.put("sampleRate", SAMPLE_RATE);
        out.put("version", "sherpa-onnx-1.13.7");

        call.resolve(out);
    }

    @PluginMethod
    public void startStt(PluginCall call) {

        if (ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.RECORD_AUDIO
        ) != PackageManager.PERMISSION_GRANTED) {

            call.reject("RECORD_AUDIO permission is required");
            return;
        }

        String modelDir = call.getString("modelDir", "");

        String encoder = call.getString(
                "encoder",
                modelDir + "/encoder.onnx"
        );

        String decoder = call.getString(
                "decoder",
                modelDir + "/decoder.onnx"
        );

        String joiner = call.getString(
                "joiner",
                modelDir + "/joiner.onnx"
        );

        String tokens = call.getString(
                "tokens",
                modelDir + "/tokens.txt"
        );

        if (modelDir.isEmpty()
                || encoder.isEmpty()
                || decoder.isEmpty()
                || joiner.isEmpty()
                || tokens.isEmpty()) {

            call.reject(
                    "modelDir or streaming transducer model paths are missing"
            );
            return;
        }

        if (recording.get()) {
            call.reject("STT is already recording");
            return;
        }

        executor.execute(() -> {

            OnlineRecognizer localRecognizer = null;
            OnlineStream localStream = null;
            AudioRecord localRecorder = null;

            try {

                /*
                 * Sherpa 1.13.7 uses Kotlin data classes.
                 * There is no builder() API.
                 */

                FeatureConfig featureConfig =
                        new FeatureConfig();

                featureConfig.setSampleRate(SAMPLE_RATE);

                /*
                 * Standard 80-dimensional log-mel feature configuration.
                 */
                featureConfig.setFeatureDim(80);
                featureConfig.setDither(0.0f);

                OnlineTransducerModelConfig transducer =
                        new OnlineTransducerModelConfig();

                transducer.setEncoder(encoder);
                transducer.setDecoder(decoder);
                transducer.setJoiner(joiner);

                OnlineModelConfig model =
                        new OnlineModelConfig();

                model.setTransducer(transducer);
                model.setTokens(tokens);
                model.setNumThreads(
                        Math.max(
                                1,
                                Math.min(
                                        4,
                                        Runtime.getRuntime()
                                                .availableProcessors() / 2
                                )
                        )
                );
                model.setDebug(false);
                model.setProvider("cpu");

                OnlineRecognizerConfig config =
                        new OnlineRecognizerConfig();

                config.setFeatConfig(featureConfig);
                config.setModelConfig(model);
                config.setDecodingMethod("greedy_search");
                config.setEnableEndpoint(true);

                /*
                 * Sherpa Android 1.13.7 requires AssetManager.
                 */
                localRecognizer =
                        new OnlineRecognizer(
                                getContext().getAssets(),
                                config
                        );

                /*
                 * Sherpa 1.13.7 requires an initial-text argument.
                 * Empty string is the normal choice.
                 */
                localStream =
                        localRecognizer.createStream("");

                int minBuffer =
                        AudioRecord.getMinBufferSize(
                                SAMPLE_RATE,
                                AudioFormat.CHANNEL_IN_MONO,
                                AudioFormat.ENCODING_PCM_16BIT
                        );

                if (minBuffer <= 0) {
                    throw new IllegalStateException(
                            "AudioRecord buffer size unavailable"
                    );
                }

                localRecorder =
                        new AudioRecord(
                                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                                SAMPLE_RATE,
                                AudioFormat.CHANNEL_IN_MONO,
                                AudioFormat.ENCODING_PCM_16BIT,
                                Math.max(
                                        minBuffer * 2,
                                        SAMPLE_RATE / 2
                                )
                        );

                if (localRecorder.getState()
                        != AudioRecord.STATE_INITIALIZED) {

                    localRecorder.release();

                    throw new IllegalStateException(
                            "AudioRecord initialization failed"
                    );
                }

                recognizer = localRecognizer;
                stream = localStream;
                recorder = localRecorder;

                activeSttCall = call;
                recording.set(true);

                OnlineRecognizer finalRecognizer =
                        localRecognizer;

                OnlineStream finalStream =
                        localStream;

                AudioRecord finalRecorder =
                        localRecorder;

                main.post(() ->
                        notifyListeners(
                                "sttStarted",
                                new JSObject()
                                        .put("recording", true)
                                        .put("sampleRate", SAMPLE_RATE)
                        )
                );

                /*
                 * Safety timeout: maximum 30 seconds.
                 */
                main.postDelayed(
                        () -> {
                            if (recording.get()) {
                                recording.set(false);
                            }
                        },
                        30000L
                );

                finalRecorder.startRecording();

                short[] pcm = new short[2048];
                float[] samples = new float[2048];

                while (recording.get()) {

                    int read =
                            finalRecorder.read(
                                    pcm,
                                    0,
                                    pcm.length,
                                    AudioRecord.READ_BLOCKING
                            );

                    if (read <= 0) {
                        continue;
                    }

                    for (int i = 0; i < read; i++) {
                        samples[i] =
                                pcm[i] / 32768.0f;
                    }

                    finalStream.acceptWaveform(
                            samples,
                            SAMPLE_RATE
                    );

                    while (
                            finalRecognizer.isReady(finalStream)
                    ) {
                        finalRecognizer.decode(finalStream);
                    }

                    String text =
                            finalRecognizer
                                    .getResult(finalStream)
                                    .getText();

                    if (text != null
                            && !text.trim().isEmpty()) {

                        JSObject event =
                                new JSObject();

                        event.put(
                                "text",
                                text.trim()
                        );

                        event.put(
                                "final",
                                false
                        );

                        notifyListeners(
                                "sttPartial",
                                event
                        );
                    }
                }

            } catch (Throwable e) {

                recording.set(false);

                cleanupStt();

                PluginCall pending =
                        activeSttCall;

                activeSttCall = null;

                main.post(() -> {

                    String error =
                            "Sherpa-ONNX STT failed: "
                                    + message(e);

                    if (pending != null) {
                        pending.reject(error);
                    } else {
                        call.reject(error);
                    }
                });
            }
        });
    }

    @PluginMethod
    public void stopStt(PluginCall call) {

        recording.set(false);

        executor.execute(() -> {

            try {

                OnlineRecognizer r =
                        recognizer;

                OnlineStream s =
                        stream;

                String text = "";

                if (r != null && s != null) {

                    /*
                     * Flush a short silence tail.
                     */
                    float[] tail =
                            new float[
                                    (int) (0.8f * SAMPLE_RATE)
                            ];

                    s.acceptWaveform(
                            tail,
                            SAMPLE_RATE
                    );

                    while (r.isReady(s)) {
                        r.decode(s);
                    }

                    /*
                     * Sherpa 1.13.7:
                     * inputFinished() belongs to OnlineStream.
                     */
                    s.inputFinished();

                    while (r.isReady(s)) {
                        r.decode(s);
                    }

                    text =
                            r.getResult(s)
                                    .getText();
                }

                JSObject out =
                        new JSObject();

                out.put(
                        "recording",
                        false
                );

                out.put(
                        "text",
                        text == null
                                ? ""
                                : text.trim()
                );

                PluginCall pending =
                        activeSttCall;

                activeSttCall = null;

                if (pending != null) {
                    pending.resolve(out);
                }

                call.resolve(
                        new JSObject()
                                .put("recording", false)
                );

            } catch (Throwable e) {

                call.reject(
                        "Sherpa-ONNX STT stop failed: "
                                + message(e)
                );

            } finally {

                cleanupStt();
            }
        });
    }

    @PluginMethod
    public void speak(PluginCall call) {

        String text =
                call.getString("text", "");

        String model =
                call.getString("model", "");

        String tokens =
                call.getString("tokens", "");

        String dataDir =
                call.getString("dataDir", "");

        String lexicon =
                call.getString("lexicon", "");

        int sid =
                call.getInt("sid", 0);

        double speed =
                Math.max(
                        0.5,
                        Math.min(
                                2.0,
                                call.getDouble(
                                        "speed",
                                        1.0
                                )
                        )
                );

        if (text.trim().isEmpty()
                || model.isEmpty()
                || tokens.isEmpty()) {

            call.reject(
                    "text, model and tokens are required for offline TTS"
            );
            return;
        }

        executor.execute(() -> {

            OfflineTts tts = null;

            try {

                /*
                 * Sherpa 1.13.7 uses Kotlin data classes.
                 */

                OfflineTtsVitsModelConfig vits =
                        new OfflineTtsVitsModelConfig();

                vits.setModel(model);
                vits.setTokens(tokens);
                vits.setDataDir(dataDir);
                vits.setLexicon(lexicon);

                OfflineTtsModelConfig modelConfig =
                        new OfflineTtsModelConfig();

                modelConfig.setVits(vits);
                modelConfig.setNumThreads(
                        Math.max(
                                1,
                                Math.min(
                                        4,
                                        Runtime.getRuntime()
                                                .availableProcessors() / 2
                                )
                        )
                );
                modelConfig.setDebug(false);
                modelConfig.setProvider("cpu");

                OfflineTtsConfig config =
                        new OfflineTtsConfig();

                config.setModel(modelConfig);

                /*
                 * Sherpa Android 1.13.7 requires AssetManager.
                 */
                tts =
                        new OfflineTts(
                                getContext().getAssets(),
                                config
                        );

                GenerationConfig generation =
                        new GenerationConfig();

                generation.setSid(sid);
                generation.setSpeed(
                        (float) speed
                );
                generation.setSilenceScale(
                        0.2f
                );

                com.k2fsa.sherpa.onnx.GeneratedAudio audio =
                        tts.generateWithConfig(
                                text,
                                generation
                        );

                if (audio == null
                        || audio.getSamples() == null) {

                    throw new IllegalStateException(
                            "Sherpa returned no generated audio"
                    );
                }

                playPcm(
                        audio.getSamples(),
                        audio.getSampleRate()
                );

                JSObject out =
                        new JSObject();

                out.put(
                        "ok",
                        true
                );

                out.put(
                        "sampleRate",
                        audio.getSampleRate()
                );

                out.put(
                        "samples",
                        audio.getSamples().length
                );

                call.resolve(out);

            } catch (Throwable e) {

                call.reject(
                        "Sherpa-ONNX TTS failed: "
                                + message(e)
                );

            } finally {

                if (tts != null) {
                    try {
                        tts.release();
                    } catch (Throwable ignored) {
                    }
                }
            }
        });
    }

    private void playPcm(
            float[] samples,
            int sampleRate
    ) {

        if (samples == null
                || samples.length == 0) {
            return;
        }

        short[] out =
                new short[samples.length];

        for (int i = 0;
                i < samples.length;
                i++) {

            float value =
                    Math.max(
                            -1.0f,
                            Math.min(
                                    1.0f,
                                    samples[i]
                            )
                    );

            out[i] =
                    (short) Math.round(
                            value * 32767.0f
                    );
        }

        int min =
                AudioTrack.getMinBufferSize(
                        sampleRate,
                        AudioFormat.CHANNEL_OUT_MONO,
                        AudioFormat.ENCODING_PCM_16BIT
                );

        if (min <= 0) {
            min = sampleRate / 2;
        }

        AudioTrack track =
                new AudioTrack(
                        AudioManager.STREAM_MUSIC,
                        sampleRate,
                        AudioFormat.CHANNEL_OUT_MONO,
                        AudioFormat.ENCODING_PCM_16BIT,
                        Math.max(
                                min,
                                out.length * 2
                        ),
                        AudioTrack.MODE_STREAM
                );

        try {

            track.play();

            int offset = 0;

            while (offset < out.length) {

                int written =
                        track.write(
                                out,
                                offset,
                                out.length - offset
                        );

                if (written <= 0) {
                    break;
                }

                offset += written;
            }

            track.stop();

        } finally {

            track.release();
        }
    }

    private void cleanupStt() {

        AudioRecord r =
                recorder;

        recorder = null;

        if (r != null) {

            try {
                if (r.getRecordingState()
                        == AudioRecord.RECORDSTATE_RECORDING) {
                    r.stop();
                }
            } catch (Throwable ignored) {
            }

            try {
                r.release();
            } catch (Throwable ignored) {
            }
        }

        OnlineStream s =
                stream;

        stream = null;

        if (s != null) {

            try {
                s.release();
            } catch (Throwable ignored) {
            }
        }

        OnlineRecognizer recognizerLocal =
                recognizer;

        recognizer = null;

        if (recognizerLocal != null) {

            try {
                recognizerLocal.release();
            } catch (Throwable ignored) {
            }
        }
    }

    private static String message(
            Throwable throwable
    ) {

        if (throwable == null) {
            return "unknown error";
        }

        String message =
                throwable.getMessage();

        return message == null
                ? throwable.getClass()
                        .getSimpleName()
                : message;
    }

    @Override
    protected void handleOnDestroy() {

        recording.set(false);

        executor.execute(
                this::cleanupStt
        );

        executor.shutdownNow();

        super.handleOnDestroy();
    }
}
