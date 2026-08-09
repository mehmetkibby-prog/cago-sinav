# Yeni ve Boş GitHub Deposuna Yükleme

Bu paket, daha önce hiçbir dosya bulunmayan yeni bir GitHub deposuna yüklenmek
üzere hazırlanmış tam V26.28 Android kaynak paketidir.

## Yükleme

1. ZIP dosyasını açın.
2. Açılan klasörün **içindeki** bütün dosya ve klasörleri yeni GitHub deposunun
   ana dizinine yükleyin.
3. `.github`, `native-android`, `scripts`, `tests` ve `www` klasörlerinin
   depoda göründüğünü kontrol edin.
4. macOS'ta `.github` görünmüyorsa Finder'da `Command + Shift + .` tuşlarına
   basın.
5. GitHub'da **Actions → APK oluştur → Run workflow** yolunu izleyin.
6. İşlem tamamlanınca **Muzik-Sinavi-Android-V26.28-Tablet-Duzeltmeli-APK** çıktısını
   indirin ve içindeki `app-debug.apk` dosyasını tablete kurun.

## Neden depoda `android` klasörü yok?

`android` klasörü derleme çıktısıdır ve içindeki 40 AGS sayfası `www` içeriğinin
ikinci kopyası olduğu için GitHub web yüklemesindeki dosya sayısını gereksiz
artırır. Actions bu klasörü otomatik oluşturur. Ardından `native-android`
klasöründeki uygulamaya özel ana Android dosyalarını yerlerine koyar:

- PDF kaydetme eklentisi
- Türkçe yerel sesli okuma (TTS) eklentisi
- Mikrofon izinleri
- Uygulama sürümü ve paket kimliği
- Ana Android etkinliği

Bu nedenle `android` klasörünün depoda olmaması özellik eksikliği oluşturmaz;
özel kodlar görünür biçimde `native-android` altında saklanır ve her derlemede
test edilir.

`node_modules` ve sonradan oluşan `android` klasörünü GitHub'a yüklemeyin.
