# Sabit Android Güncelleme İmzası

V26.31'den itibaren GitHub'ın her çalışmada oluşturduğu geçici debug imzası
kullanılmaz. APK, yalnız deponun GitHub Actions Secrets alanında bulunan kalıcı
anahtarla imzalanır.

## Bir kez yapılacak kurulum

1. Ayrı teslim edilen `Muzik-Sinavi-GitHub-Sabit-Imza-Kurulumu.zip` dosyasını
   açın. Bu özel paketi GitHub'a yüklemeyin ve kimseyle paylaşmayın.
2. GitHub deposunda **Settings → Secrets and variables → Actions** yolunu açın.
3. **New repository secret** ile `ANDROID_KEYSTORE_BASE64` adlı Secret oluşturun;
   değerine aynı adlı `.txt` dosyasının tamamını yapıştırın.
4. İkinci Secret'ı `ANDROID_KEYSTORE_PASSWORD` adıyla oluşturun; değerine aynı
   adlı `.txt` dosyasının tek satırını yapıştırın.
5. Actions iş akışını çalıştırın. Eksik veya yanlış Secret varsa derleme açık bir
   hata vererek durur; rastgele başka bir anahtarla APK üretmez.

Bu iki Secret'ı sonraki sürümlerde değiştirmeyin. Başka bir GitHub deposuna
geçerseniz aynı iki değeri yeni deponun Secrets alanına da ekleyin. Özel imza
paketini güvenli bir yerde saklayın; kaybolursa kurulu uygulamanın üzerine yeni
güncelleme imzalanamaz.

V26.30 geçici imzalı olduğu için V26.31'e geçerken son kez kaldırma gerekir.
V26.31 ve sonrasındaki sürümler doğrudan mevcut uygulamanın üzerine kurulur.
