const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const gradle = read("native-android/app/build.gradle");
const workflow = read(".github/workflows/main.yml");
const gitignore = read(".gitignore");

[
  'System.getenv("ANDROID_KEYSTORE_PATH")',
  'System.getenv("ANDROID_KEYSTORE_PASSWORD")',
  '"muzik_sinavi_update"',
  "signingConfig signingConfigs.stableUpdate",
].forEach(fragment => assert.ok(gradle.includes(fragment), `Sabit imza Gradle kuralı eksik: ${fragment}`));

[
  "secrets.ANDROID_KEYSTORE_BASE64",
  "secrets.ANDROID_KEYSTORE_PASSWORD",
  "base64 --decode",
  "keytool -list",
  "Muzik-Sinavi-Android-V26.32-Guncelleme.apk",
].forEach(fragment => assert.ok(workflow.includes(fragment), `GitHub sabit imza adımı eksik: ${fragment}`));

assert.ok(gitignore.includes("*.jks") && gitignore.includes("*.keystore"),
  "Özel imza anahtarları Git tarafından dışlanmıyor");
assert.equal(fs.existsSync(path.join(root, "signing")), false,
  "Özel imza anahtarı yanlışlıkla GitHub paketine eklenmiş");

console.log("GitHub sabit Android güncelleme imzası ve gizli anahtar koruması doğrulandı.");
