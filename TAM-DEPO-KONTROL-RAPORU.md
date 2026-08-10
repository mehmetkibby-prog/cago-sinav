# V26.31 Tam Depo Kontrol Raporu

Bu paket yeni ve boş bir GitHub deposu için hazırlanmıştır.

## Doğrulanan kaynaklar

- Uygulama ana kodu ve ekranları: `www`
- Müzik ve Eğitim Bilimleri soru bankaları
- 40/40 AGS orijinal sayfası
- 12/12 konu, 12/12 test, 81/81 soru ve 81/81 resmî çözüm
- 2026 Gerçek Sınav üretim ve kurtarma motoru
- Android PDF kaydetme eklentisi
- Android Türkçe yerel TTS eklentisi
- Mikrofon izinleri ve ana Android etkinliği
- V26.31 sürüm kodu ve `com.caglar.muziksinavi` paket kimliği
- Android tablette AGS yazı taşması düzeltmesi
- Seçili konu cümlesini kaydetme ve ayrı kayıt bölümü
- GitHub Actions APK iş akışı
- GitHub Secrets tabanlı sabit Android güncelleme imzası

## Temiz depo doğrulaması

Paket boş bir klasöre kopyalanmış, `android` projesi sıfırdan üretilmiş ve
`native-android` şablonları otomatik yerleştirilmiştir. Oluşan yerel proje,
V26.30 tam Android projesindeki bütün kaynaklar korunmuştur. AGS tablet düzeni
kökten kapsamlanmış ve gelecekte yerel verileri koruyacak sabit APK imza akışı
eklenmiştir.

Kaynak dosya sayısı GitHub web yüklemesi için 100'ün altındadır. `android` ve
`node_modules` yalnız derleme sırasında oluşturulur; depoya yüklenmez.
