# V26.32 Tam Depo Kontrol Raporu

## Doğrulanan V26.32 içeriği

- Dört merkezli, tablet portre ve yatay görünüme uyarlanmış ana menü
- Altı Eğitim Bilimleri özeti ve 8/8 özgün özet sayfası
- Özetlerin görsel aslı ve seçilebilir metin okuyucusu
- Seçilen özet dışına çıkmayan, dayanak ifadesini doğrulayan AI test motoru
- KPSS Eğitim Bilimleri test kitabının 208/208 sayfası
- Sayfa değiştirme, sayfaya gitme, yakınlaştırma ve kaldığın yerden devam
- 2026 Gerçek Sınav, 2025 Müzik Sınavı ve mevcut bütün soru bankaları
- 40/40 AGS sayfası, 12/12 konu, 12/12 test, 81/81 soru ve çözüm
- Cümle kaydetme, yanlışlar, ilerleme, ayarlar, PDF ve Türkçe TTS
- `com.caglar.muziksinavi` paket kimliği ve Android `versionCode 2632`
- V26.31'de kurulan GitHub Secrets tabanlı kalıcı güncelleme imzası
- Yalnız elle başlatılan GitHub Actions APK iş akışı

## Otomatik denetimler

- Altı ders adının ve kaynak metinlerinin bütünlüğü
- 8 özet görselinin ve 208 kitap sayfasının varlığı ve boş olmaması
- AI sorularının seçilen özetten kanıt göstermesi ve web motorunu kullanmaması
- Yeni menü modüllerinin uygulamada etkin olması
- V26.32 sürüm kodu, sabit paket kimliği ve imza yapılandırması
- Eski V26.31 özelliklerinin geriye dönük korunması
- Android yerel PDF, TTS, mikrofon ve ana etkinlik kaynakları

`android` ve `node_modules` klasörleri teslim kaynağı değildir; temiz derlemede
otomatik oluşturulur. KPSS kitabının dosya sayısı nedeniyle tarayıcı güncellemesi
100 dosyanın altında kalan dört ayrı yükleme bölümüne ayrılmıştır.
