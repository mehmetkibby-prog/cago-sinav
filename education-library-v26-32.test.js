const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const manifest = JSON.parse(read("www/education-library/education-library.json"));

assert.equal(manifest.version, "26.32");
assert.equal(manifest.summaries.length, 6, "Altı gönderilmiş ders özeti korunmalı");
assert.equal(manifest.summaries.reduce((total, item) => total + item.pages, 0), 8, "Özetlerin sekiz özgün sayfası olmalı");
assert.equal(manifest.book.pages, 208, "KPSS test kitabı 208 sayfa olmalı");

const expectedSubjects = [
  "Program Geliştirme",
  "Gelişim Psikolojisi",
  "Öğrenme Psikolojisi",
  "Öğretim Yöntem ve Teknikleri",
  "Rehberlik",
  "Ölçme ve Değerlendirme",
];
assert.deepEqual(manifest.summaries.map(item => item.title), expectedSubjects);

for (const summary of manifest.summaries) {
  assert.ok(summary.aiText.length >= 10000, `${summary.title} AI kaynak metni eksik`);
  for (let page = 1; page <= summary.pages; page += 1) {
    const relative = summary.imagePattern.replace("{page}", String(page).padStart(2, "0"));
    const file = path.join(root, "www", relative.replace(/^education-library\//, "education-library/"));
    assert.ok(fs.statSync(file).size > 10000, `${summary.title} sayfa ${page} görseli boş`);
  }
}

const bookDirectory = path.join(root, "www/education-library/kpss-pages");
const bookPages = fs.readdirSync(bookDirectory).filter(name => /^page-\d{3}\.webp$/.test(name)).sort();
assert.equal(bookPages.length, 208, "KPSS okuyucusunun tüm sayfaları eklenmeli");
assert.equal(bookPages[0], "page-001.webp");
assert.equal(bookPages.at(-1), "page-208.webp");
bookPages.forEach(name => assert.ok(fs.statSync(path.join(bookDirectory, name)).size > 10000, `${name} boş`));

const html = read("www/index.html");
const app = read("www/app.js");
const menu = read("www/menu-v2632.js");
const library = read("www/education-library.js");
const css = read("www/education-library.css");
const gradle = read("native-android/app/build.gradle");
const workflow = read(".github/workflows/main.yml");

["menu-v2632.css", "education-library.css", "education-library.js", "menu-v2632.js"].forEach(asset => {
  assert.ok(html.includes(asset), `index.html yeni katmanı yüklemiyor: ${asset}`);
});
assert.ok(app.includes("renderV2632Home()"), "Yeni gruplu ana menü etkin değil");
assert.ok(app.includes("renderV2632More()"), "Daha Fazla menüsü gruplandırılmamış");
["Müzik ve Sınavlar", "Eğitim Bilimleri", "AI ve Çalışma Araçları", "Kayıtlar ve Gelişim", "2026 Gerçek", "2025 Müzik"].forEach(label => {
  assert.ok(menu.includes(label), `Menü öğesi eksik: ${label}`);
});
["Yalnız bu özet metnindeki", "evidenceNormalized", "reference.includes", "openAIText", "208"].forEach(fragment => {
  assert.ok(library.includes(fragment), `Özet tabanlı güvence eksik: ${fragment}`);
});
assert.ok(!library.includes("openAIWebText"), "Özet tabanlı test web bilgisini kullanmamalı");
assert.ok(css.includes(".kpss-book-frame") && css.includes("overflow:auto"), "Kitap yakınlaştırma/taşma katmanı eksik");
assert.ok(gradle.includes("versionCode 2632") && gradle.includes('versionName "26.32"'), "Android V26.32 sürüm kodu yanlış");
assert.ok(gradle.includes("signingConfigs") && workflow.includes("ANDROID_KEYSTORE_BASE64"), "Sabit güncelleme imzası korunmadı");
assert.ok(workflow.includes("workflow_dispatch") && !workflow.includes("push:"), "Çok parçalı GitHub yüklemesinde APK yalnız elle başlatılmalı");

console.log("V26.32 menü, özet, AI dayanak ve 208 sayfalık KPSS kütüphanesi doğrulandı.");
