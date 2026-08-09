package com.caglar.muziksinavi;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "PdfSaver")
public class PdfSaverPlugin extends Plugin {
    private static final int MINIMUM_PDF_BYTES = 5000;
    private File pendingPdf;

    @PluginMethod
    public void save(PluginCall call) {
        String base64 = call.getString("base64");
        if (base64 == null || base64.isEmpty()) {
            call.reject("PDF verisi boş.");
            return;
        }
        try {
            byte[] decoded = Base64.decode(base64, Base64.DEFAULT);
            boolean hasPdfHeader = decoded.length >= 5
                    && decoded[0] == '%'
                    && decoded[1] == 'P'
                    && decoded[2] == 'D'
                    && decoded[3] == 'F'
                    && decoded[4] == '-';
            if (decoded.length < MINIMUM_PDF_BYTES || !hasPdfHeader) {
                call.reject("PDF içeriği geçersiz veya boş; dosya kaydedilmedi.");
                return;
            }

            clearPendingPdf();
            pendingPdf = File.createTempFile("muzik-sinavi-pdf-", ".pdf", getContext().getCacheDir());
            try (FileOutputStream tempOutput = new FileOutputStream(pendingPdf, false)) {
                tempOutput.write(decoded);
                tempOutput.flush();
                tempOutput.getFD().sync();
            }
            if (!pendingPdf.isFile() || pendingPdf.length() != decoded.length) {
                clearPendingPdf();
                call.reject("PDF geçici dosyaya eksiksiz hazırlanamadı.");
                return;
            }
        } catch (Exception error) {
            clearPendingPdf();
            call.reject("PDF verisi hazırlanamadı.", error);
            return;
        }

        String requestedName = call.getString("filename", "calisma-ozeti.pdf");
        String safeName = requestedName.replaceAll("[\\\\/:*?\"<>|]", "-");
        if (!safeName.toLowerCase().endsWith(".pdf")) {
            safeName += ".pdf";
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("application/pdf");
        intent.putExtra(Intent.EXTRA_TITLE, safeName);
        startActivityForResult(call, intent, "saveResult");
    }

    @ActivityCallback
    private void saveResult(PluginCall call, ActivityResult result) {
        JSObject response = new JSObject();
        if (call == null) {
            return;
        }
        if (result.getResultCode() != Activity.RESULT_OK
                || result.getData() == null
                || result.getData().getData() == null) {
            clearPendingPdf();
            response.put("saved", false);
            call.resolve(response);
            return;
        }

        Uri destination = result.getData().getData();
        if (pendingPdf == null || !pendingPdf.isFile() || pendingPdf.length() < MINIMUM_PDF_BYTES) {
            clearPendingPdf();
            call.reject("Hazırlanan PDF bulunamadı; boş dosya kaydedilmedi.");
            return;
        }

        long expectedBytes = pendingPdf.length();
        try (InputStream input = new FileInputStream(pendingPdf);
             OutputStream output = getContext().getContentResolver().openOutputStream(destination, "rwt")) {
            if (output == null) {
                clearPendingPdf();
                call.reject("Seçilen dosya açılamadı.");
                return;
            }
            byte[] buffer = new byte[64 * 1024];
            int read;
            long written = 0;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                written += read;
            }
            output.flush();

            if (written != expectedBytes) {
                throw new IllegalStateException(
                        "Eksik veri yazıldı: " + written + " / " + expectedBytes + " bayt."
                );
            }

            response.put("saved", true);
            response.put("bytes", written);
            response.put("uri", destination.toString());
            clearPendingPdf();
            call.resolve(response);
        } catch (Exception error) {
            clearPendingPdf();
            try {
                getContext().getContentResolver().delete(destination, null, null);
            } catch (Exception ignored) {
                // Bazı belge sağlayıcıları silmeye izin vermez.
            }
            call.reject("PDF kaydedilemedi: " + error.getMessage(), error);
        }
    }

    private void clearPendingPdf() {
        if (pendingPdf != null && pendingPdf.exists()) {
            //noinspection ResultOfMethodCallIgnored
            pendingPdf.delete();
        }
        pendingPdf = null;
    }
}
