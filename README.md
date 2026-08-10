# Müzik Sınavı Android V26.32 — Eğitim Bilimleri Kütüphanesi

V26.32, V26.31'in bütün özelliklerini ve yerel verilerini koruyarak ana ekranı
dört anlaşılır çalışma merkezinde toplar. Gönderilen Eğitim Bilimleri özetleri,
yalnız bu özetlere dayanan AI testi ve 208 sayfalık KPSS Eğitim Bilimleri test
kitabı uygulamaya çevrimdışı okunabilir biçimde eklenmiştir.

## V26.32 yenilikleri

- **Müzik ve Sınavlar:** 2026 Gerçek Sınav, 2025 Müzik Sınavı, denemeler ve
  mevcut müzik çalışma araçları
- **Eğitim Bilimleri:** altı ders özeti, özetlere dayalı AI testi, KPSS Eğitim
  Bilimleri test kitabı ve mevcut Eğitim Bilimleri soru alanları
- **AI ve Çalışma Araçları:** AI konu anlatımı, AI testleri, AGS ve diğer çalışma
  araçları
- **Kayıtlar ve Gelişim:** yanlışlar, ilerleme, kaydedilmiş cümleler ve ayarlar

Ana ekranda yalnız bu dört merkez görünür; mevcut özellikler ilgili merkezin
içinde korunur. Düzen hem tablet portre hem de yatay kullanım için uyarlanmıştır.

## Eğitim Bilimleri özetleri

1. Program Geliştirme
2. Gelişim Psikolojisi
3. Öğrenme Psikolojisi
4. Öğretim Yöntem ve Teknikleri
5. Rehberlik
6. Ölçme ve Değerlendirme

Toplam 8 özgün özet sayfası hem görsel aslıyla hem seçilebilir metin görünümüyle
okunabilir. Metin görünümündeki cümleler mevcut **Cümleyi Kaydet** sistemiyle
kaydedilebilir.

## Özetlere dayalı AI testi

- Altı dersten biri seçilebilir.
- 5, 10, 15 veya 20 soru ve kolay, orta veya zor seviye seçilebilir.
- Sorular yalnız seçilen özetin uygulamadaki tam metnine göre üretilir; web
  bilgisi kullanılmaz.
- Her sorunun özette geçen bir dayanak ifadesi bulunmalıdır. Dayanağı özette
  doğrulanamayan soru teste alınmaz.
- Dört seçenek, doğru cevap, açıklama ve kaynak özeti birlikte gösterilir.

## KPSS Eğitim Bilimleri test kitabı

Gönderilen `KPSS-EĞİTİM-BİLİMLERİ.pdf` dosyasının 208/208 sayfası çevrimdışı
kitap okuyucuya eklenmiştir. Önceki/sonraki sayfa, sayfaya gitme, yakınlaştırma
ve kaldığın sayfadan devam özellikleri vardır. Okuyucu yalnız açık sayfayı
yükleyerek tablet belleğini korur.

## Korunan özellikler

- 2026 Gerçek Sınav kaynak sistemi ve 2025 Müzik Sınavı
- 40 sayfalık AGS kitabı, 12 konu, 12 test, 81 soru ve resmî çözümleri
- Mevcut müzik ve Eğitim Bilimleri soru bankaları
- Yanlışlar, ilerleme, kayıtlı cümleler, ayarlar ve API anahtarı
- Android PDF kaydetme, Türkçe yerel TTS ve mikrofon izinleri
- Paket kimliği `com.caglar.muziksinavi`
- GitHub Secrets içindeki V26.31 kalıcı Android güncelleme imzası

## V26.31'den güncelleme

V26.32 aynı paket kimliğini ve V26.31'de kurulan sabit imzayı kullanır. Eski
uygulamayı kaldırmayın; V26.32 APK'sını doğrudan üzerine kurun. Böylece yanlışlar,
ilerleme, kayıtlı cümleler, ayarlar ve API anahtarı korunur. GitHub Secrets
değerlerini değiştirmeyin.

GitHub web yükleme sınırı nedeniyle güncelleme dört ZIP'e ayrılmıştır. Ayrıntılı
sıra için `V26.32-GUNCELLEME-TALIMATI.md` dosyasını okuyun. Dört bölümün içeriği
depoya yüklendikten sonra **Actions → APK oluştur → Run workflow** yalnız bir
kez çalıştırılır.

## Kaynak yapısı

- `www`: uygulama ekranları, soru bankaları ve yeni menü
- `www/education-library`: altı özet, 208 kitap sayfası ve içerik manifesti
- `www/ags-workbook-pages`: AGS kitabının 40/40 sayfası
- `native-android`: PDF, TTS, mikrofon ve Android ana etkinlik kaynakları
- `scripts/prepare-android.sh`: Android projesini üretip özel kodları yerleştirir
- `.github/workflows/main.yml`: elle başlatılan sabit imzalı APK iş akışı
- `tests`: içerik, menü, imza, sürüm ve Android kaynak denetimleri

## Yerel derleme

```bash
npm ci
npm run test:quality
npm run android:prepare
npm run build:apk
```

APK `android/app/build/outputs/apk/debug/app-debug.apk` konumunda oluşur.
`android` ve `node_modules` üretilen klasörlerdir; GitHub'a yüklenmez.
