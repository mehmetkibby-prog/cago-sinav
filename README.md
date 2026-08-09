# Müzik Sınavı Android V26.27 — Yeni GitHub Deposu Tam Kaynak

Bu paket yeni ve boş bir GitHub deposuna doğrudan yüklenmek için hazırlanmıştır.
Uygulamanın web kaynakları, soru bankaları, AGS kitabı, otomatik APK iş akışı
ve Android'e özel PDF/TTS kodları birlikte bulunur.

## Pakette bulunan ana parçalar

- `www`: uygulamanın bütün ekranları, ana kodu ve soru bankaları
- `www/ags-workbook-pages`: PDF'nin 40/40 orijinal sayfası
- `native-android`: PDF kaydetme, Türkçe TTS, mikrofon izinleri ve Android ana
  etkinliği
- `scripts/prepare-android.sh`: yerel Android projesini üretip özel kodları
  otomatik yerleştirir
- `.github/workflows/main.yml`: GitHub üzerinde APK oluşturur
- `tests`: 2026 motorunu, AGS bütünlüğünü ve yerel Android kodlarını denetler
- `package.json`, `package-lock.json`, `capacitor.config.json`: bağımlılık ve
  proje yapılandırması

## V26.27 — AGS Eğitim Bilimleri Kitabı

- 40 orijinal sayfa
- 12 konu anlatımı
- 12 test
- 81 soru, beş seçenek ve 81 resmî çözüm
- Arama, alan filtresi, ilerleme kaydı ve kaldığın yerden devam
- Yanlış cevapları Eğitim Bilimleri yanlışlarına kaydetme

## Korunan Android özellikleri

- PDF'nin boş veya 0 KB kaydedilmesini önleyen yerel PDF kaydetme kodu
- Türkçe cihaz sesini kullanan yerel TTS kodu
- Mikrofon izni ve ses ayarları
- `com.caglar.muziksinavi` paket kimliği
- V26.27 sürüm kodu
- Samsung tablet görünümü ve mevcut soru bankaları

## GitHub ile APK oluşturma

Ayrıntılar için `GITHUB-YUKLEME-ADIMLARI.md` dosyasını okuyun. Kısaca:

1. Bu klasörün içindeki her şeyi yeni deponun ana dizinine yükleyin.
2. `.github` klasörünün yüklendiğini doğrulayın.
3. **Actions → APK oluştur → Run workflow** seçeneğini çalıştırın.
4. `Muzik-Sinavi-Android-V26.27-Tam-Debug-APK` çıktısını indirin.

## Yerel derleme

```bash
npm ci
npm run test:quality
npm run android:prepare
npm run build:apk
```

APK `android/app/build/outputs/apk/debug/app-debug.apk` konumunda oluşur.

> `android` ve `node_modules` klasörleri üretilen klasörlerdir; GitHub'a
> yüklenmez. Uygulamaya özel Android ana kodları `native-android` altında
> kaynak olarak korunur.
