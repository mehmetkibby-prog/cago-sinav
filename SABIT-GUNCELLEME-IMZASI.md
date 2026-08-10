# Sabit Android Güncelleme İmzası

V26.32, V26.31'de kurulan kalıcı Android güncelleme imzasını aynen kullanır.
Paket kimliği de değişmez: `com.caglar.muziksinavi`.

## Mevcut GitHub deposunda

**Settings → Secrets and variables → Actions** bölümündeki şu iki Secret'a
dokunmayın:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`

Bu değerleri değiştirmek farklı bir imza üretir ve yeni APK'nın mevcut
uygulamanın üzerine kurulmasını engeller. Özel anahtar dosyasını veya Secret
değerlerini hiçbir zaman GitHub deposuna yüklemeyin.

## V26.32 kurulumu

V26.31 uygulamasını kaldırmayın. V26.32 APK'sını doğrudan üzerine kurun. Aynı
imza ve paket kimliği sayesinde yanlışlar, ilerleme, kaydedilmiş cümleler,
ayarlar ve API anahtarı korunur.

## Yeni bir GitHub deposuna geçilirse

Yalnız depo değiştirildiğinde, V26.31 için güvenle saklanan aynı iki Secret
değeri yeni deponun Actions Secrets alanına kopyalanmalıdır. Yeni anahtar
oluşturulmamalıdır. Kalıcı anahtar kaybolursa kurulu uygulamanın üzerine imzalı
güncelleme üretilemez.
