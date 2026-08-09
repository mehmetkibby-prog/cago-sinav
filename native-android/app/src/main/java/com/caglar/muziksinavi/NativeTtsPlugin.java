package com.caglar.muziksinavi;

import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "NativeTts")
public class NativeTtsPlugin extends Plugin implements TextToSpeech.OnInitListener {
    private TextToSpeech engine;
    private boolean ready;
    private boolean failed;
    private PluginCall activeCall;
    private String pendingText;
    private float pendingRate = 0.88f;
    private String utteranceId;

    @Override
    public void load() {
        engine = new TextToSpeech(getContext(), this);
    }

    @Override
    public void onInit(int status) {
        ready = status == TextToSpeech.SUCCESS;
        failed = !ready;
        if (ready) {
            engine.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onDone(String id) { finish(id, false); }
                @Override public void onStop(String id, boolean interrupted) { finish(id, true); }
                @Override public void onError(String id) { reject(id); }
                @Override public void onError(String id, int code) { reject(id); }
            });
        }
        PluginCall call = activeCall;
        if (call == null) return;
        if (failed) {
            clear();
            call.reject("Android sesli okuma motoru başlatılamadı.");
            return;
        }
        String text = pendingText;
        float rate = pendingRate;
        clear();
        speakNow(call, text, rate);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.reject("Okunacak soru bulunamadı.");
            return;
        }
        float rate = (float) Math.max(0.5, Math.min(1.5, call.getDouble("rate", 0.88)));
        stopCurrent();
        if (failed) {
            call.reject("Android sesli okuma motoru başlatılamadı.");
        } else if (!ready) {
            activeCall = call;
            pendingText = text;
            pendingRate = rate;
        } else {
            speakNow(call, text, rate);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopCurrent();
        call.resolve();
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        try {
            Intent intent = new Intent("com.android.settings.TTS_SETTINGS");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception firstError) {
            try {
                Intent intent = new Intent(Settings.ACTION_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception secondError) {
                call.reject("Sesli okuma ayarları açılamadı.", secondError);
            }
        }
    }

    private void speakNow(PluginCall call, String text, float rate) {
        int language = engine.setLanguage(new Locale("tr", "TR"));
        if (language == TextToSpeech.LANG_MISSING_DATA
                || language == TextToSpeech.LANG_NOT_SUPPORTED) {
            call.reject("Tablette Türkçe ses verisi kurulu değil.");
            return;
        }
        engine.setSpeechRate(rate);
        engine.setPitch(1.0f);
        utteranceId = UUID.randomUUID().toString();
        activeCall = call;
        Bundle params = new Bundle();
        if (engine.speak(text, TextToSpeech.QUEUE_FLUSH, params, utteranceId)
                == TextToSpeech.ERROR) {
            PluginCall failedCall = activeCall;
            clear();
            if (failedCall != null) failedCall.reject("Soru sesli okunamadı.");
        }
    }

    private void stopCurrent() {
        if (engine != null) engine.stop();
        PluginCall call = activeCall;
        clear();
        if (call != null) {
            JSObject result = new JSObject();
            result.put("stopped", true);
            call.resolve(result);
        }
    }

    private void finish(String id, boolean stopped) {
        if (utteranceId == null || !utteranceId.equals(id)) return;
        PluginCall call = activeCall;
        clear();
        if (call != null) {
            JSObject result = new JSObject();
            result.put("stopped", stopped);
            call.resolve(result);
        }
    }

    private void reject(String id) {
        if (utteranceId == null || !utteranceId.equals(id)) return;
        PluginCall call = activeCall;
        clear();
        if (call != null) call.reject("Sesli okuma sırasında cihaz motoru hata verdi.");
    }

    private void clear() {
        activeCall = null;
        pendingText = null;
        utteranceId = null;
    }

    @Override
    protected void handleOnDestroy() {
        if (engine != null) {
            engine.stop();
            engine.shutdown();
            engine = null;
        }
        super.handleOnDestroy();
    }
}
