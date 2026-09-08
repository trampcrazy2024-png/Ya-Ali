package com.yaali.assistant.plugins;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "YaAliSecureStorage")
public class SecureStoragePlugin extends Plugin {
    private static final String KEY_ALIAS = "yaali_secure_settings_v1";
    private static final String PREFS = "yaali_secure_storage";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";

    private SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (!ks.containsAlias(KEY_ALIAS)) {
            KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder(KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setUserAuthenticationRequired(false)
                    .build());
            generator.generateKey();
        }
        return ((KeyStore.SecretKeyEntry) ks.getEntry(KEY_ALIAS, null)).getSecretKey();
    }

    private SharedPreferences prefs() { return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    private String encrypt(String value) throws Exception {
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.ENCRYPT_MODE, key());
        byte[] iv = cipher.getIV();
        byte[] ciphertext = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(iv, Base64.NO_WRAP) + "." + Base64.encodeToString(ciphertext, Base64.NO_WRAP);
    }

    private String decrypt(String packed) throws Exception {
        String[] parts = packed.split("\\.", 2);
        if (parts.length != 2) throw new IllegalArgumentException("invalid secure value");
        Cipher cipher = Cipher.getInstance(TRANSFORMATION);
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
        return new String(cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }

    @PluginMethod
    public void get(PluginCall call) {
        String name = call.getString("key", "");
        try {
            String packed = prefs().getString(name, null);
            JSObject result = new JSObject();
            result.put("key", name);
            result.put("value", packed == null ? "" : decrypt(packed));
            result.put("present", packed != null);
            call.resolve(result);
        } catch (Exception e) { call.reject("Secure storage read failed", e); }
    }

    @PluginMethod
    public void set(PluginCall call) {
        String name = call.getString("key", "");
        String value = call.getString("value", "");
        try {
            if (name.isEmpty()) throw new IllegalArgumentException("key required");
            if (value.isEmpty()) prefs().edit().remove(name).apply();
            else prefs().edit().putString(name, encrypt(value)).apply();
            call.resolve();
        } catch (Exception e) { call.reject("Secure storage write failed", e); }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String name = call.getString("key", "");
        prefs().edit().remove(name).apply();
        call.resolve();
    }
}
