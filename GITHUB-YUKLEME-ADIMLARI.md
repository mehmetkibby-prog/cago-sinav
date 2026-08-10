# GitHub Yükleme ve APK Oluşturma

## Mevcut V26.31 deposunu güncelleme

V26.32 için teslim edilen dört güncelleme ZIP'ini aşağıdaki sırayla açıp
içeriklerini mevcut deponun ana dizinine yükleyin:

1. Ana kod, menü, özetler ve yapılandırma
2. KPSS kitap sayfaları 001–070
3. KPSS kitap sayfaları 071–140
4. KPSS kitap sayfaları 141–208

Her parçanın içindeki `www` gibi klasörler depo kökündeki aynı adlı klasörle
birleşmelidir. Ek bir üst klasör oluşturmamalıdır. Dört bölüm tamamlanınca
**Actions → APK oluştur → Run workflow** yolunu izleyin.

İş akışı, içerik testleri geçmeden APK üretmez. Başarılı çalışmanın çıktısı
`Muzik-Sinavi-Android-V26.32-Guncelleme-APK` adındadır.

## Kalıcı imza

V26.31 için daha önce eklenen şu iki GitHub Actions Secret aynen korunmalıdır:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`

Değerleri yeniden üretmeyin veya değiştirmeyin. Özel anahtar dosyasını ya da
Secret değerlerini depoya yüklemeyin.

## Kurulum

V26.31'i kaldırmadan V26.32 APK'sını üzerine kurun. Bu, uygulamadaki yerel
verileri korur. Paket kimliği `com.caglar.muziksinavi` olarak değişmeden kalır.

## Üretilen klasörler

`android` ve `node_modules` klasörleri GitHub'a yüklenmez. Actions bunları
derleme sırasında üretir; özel Android kaynakları `native-android` altında
saklanır.
