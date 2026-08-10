# Müzik Sınavı Android V26.31 — Kalıcı AGS Tablet Düzeni

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

## V26.28 — Android tablet düzeltmeleri

- AGS konu anlatımı başlığında tablet genişliğinde birbirine giren yazılar düzeltildi
- AGS araç çubuğunun üst uygulama başlığıyla çakışması önlendi
- Tablet portre görünümünde AGS kartları tek sütunda ve taşmadan açılır
- AGS ve AI konu anlatımlarında metne basılı tutup seçerek cümle kaydetme geri eklendi
- Kayıtları saklayan ayrı **Kaydettiğim Cümleler** bölümü eklendi
- Cümle kopyalama, tek kayıt silme ve tüm kayıtları temizleme eklendi

## V26.30 — 2026 Gerçek Sınav kaynakları

- Her yeni 2026 sorusu için 2–4 doğrudan kaynak bağlantısı zorunludur
- En az iki bağımsız alan adı ve en az bir resmî/akademik/kurumsal kaynak aranır
- MEB, üniversite/konservatuvar, akademik yayın ve güvenilir müzik ansiklopedileri önceliklidir
- Blog, forum, sosyal medya, satış ve test siteleri bilgi kaynağı olarak reddedilir
- Kaynaklar cevabı ele vermemesi için cevap verilene kadar kilitlidir
- Yazdırılabilir PDF'nin cevap ve açıklama bölümünde soru kaynakları bulunur

## V26.31 — AGS tablet düzeninin kök düzeltmesi

- Ana uygulama başlığının genel `header` kuralı yalnız gerçek üst başlığa
  kapsamlandı; AGS iç bölüm başlıklarına sızması engellendi
- AGS bölüm kapakları artık sabit 82 piksel yüksekliğe zorlanmaz ve içeriği kadar
  doğal yükseklik kaplar
- İlk konu/test kartının bölüm kapağının üzerine çıkması engellendi
- Konu filtreleri yatayda kesilmek yerine tablet genişliğine göre çok satırlı
  ızgaraya dönüşür
- V26.30 kaynak sistemi, cümle kaydetme, PDF/TTS ve bütün soru bankaları korundu

## V26.31 — Verileri koruyan GitHub güncelleme sistemi

- GitHub Actions her derlemede rastgele debug anahtarı üretmek yerine GitHub
  Secrets içindeki aynı kalıcı Android anahtarını kullanır
- Paket kimliği değişmez: `com.caglar.muziksinavi`
- V26.31'den sonraki APK'lar mevcut uygulamanın üzerine güncelleme olarak kurulur
- Yanlışlar, ilerleme, kayıtlı cümleler, ayarlar ve API anahtarı uygulama verisiyle
  birlikte korunur
- Özel anahtar kaynak paketine veya GitHub deposuna eklenmez
- V26.30'un eski geçici anahtarı bulunmadığından V26.31 geçişinde son kez kaldırıp
  kurmak gerekir; sonraki sürümlerde gerekmez

## Korunan AGS Eğitim Bilimleri Kitabı

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
- V26.31 sürüm kodu
- Samsung tablet görünümü ve mevcut soru bankaları
- GitHub Secrets ile sabit Android güncelleme imzası

## GitHub ile APK oluşturma

Ayrıntılar için `GITHUB-YUKLEME-ADIMLARI.md` dosyasını okuyun. Kısaca:

1. Bu klasörün içindeki her şeyi yeni deponun ana dizinine yükleyin.
2. `.github` klasörünün yüklendiğini doğrulayın.
3. Özel sabit imza paketindeki iki değeri GitHub Actions Secrets alanına bir kez ekleyin.
4. **Actions → APK oluştur → Run workflow** seçeneğini çalıştırın.
5. `Muzik-Sinavi-Android-V26.31-Guncelleme-APK` çıktısını indirin.

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
