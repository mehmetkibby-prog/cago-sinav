const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size === 0) {
    throw new Error(`Eksik yerel Android dosyası: ${relativePath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function mustContain(relativePath, fragments) {
  const content = read(relativePath);
  for (const fragment of fragments) {
    if (!content.includes(fragment)) {
      throw new Error(`${relativePath} içinde beklenen bölüm yok: ${fragment}`);
    }
  }
}

mustContain('native-android/app/build.gradle', [
  'versionCode 2628',
  'versionName "26.28"',
  'applicationId "com.caglar.muziksinavi"'
]);

mustContain('native-android/app/src/main/AndroidManifest.xml', [
  'android.permission.INTERNET',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS'
]);

mustContain('native-android/app/src/main/java/com/caglar/muziksinavi/MainActivity.java', [
  'registerPlugin(PdfSaverPlugin.class)',
  'registerPlugin(NativeTtsPlugin.class)',
  'requestMicrophonePermissionIfNeeded()'
]);

mustContain('native-android/app/src/main/java/com/caglar/muziksinavi/PdfSaverPlugin.java', [
  '@CapacitorPlugin(name = "PdfSaver")',
  'MINIMUM_PDF_BYTES = 5000',
  'Intent.ACTION_CREATE_DOCUMENT'
]);

mustContain('native-android/app/src/main/java/com/caglar/muziksinavi/NativeTtsPlugin.java', [
  '@CapacitorPlugin(name = "NativeTts")',
  'new Locale("tr", "TR")',
  'TextToSpeech.QUEUE_FLUSH'
]);

mustContain('.github/workflows/main.yml', [
  'npm run test:quality',
  'bash scripts/prepare-android.sh',
  './gradlew assembleDebug'
]);

mustContain('scripts/prepare-android.sh', [
  'npx cap add android',
  'npx cap sync android',
  'copy_native_file "app/src/main/java/com/caglar/muziksinavi/PdfSaverPlugin.java"',
  'copy_native_file "app/src/main/java/com/caglar/muziksinavi/NativeTtsPlugin.java"',
  'android-study-notes.js',
  'android-tablet-notes.css'
]);

console.log('Android tam depo şablonu: PDF, TTS, mikrofon izinleri ve V26.28 sürümü doğrulandı.');
