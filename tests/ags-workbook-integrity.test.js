const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const defaultAppDir = fs.existsSync(path.join(__dirname, "../app")) ? path.join(__dirname, "../app") : path.join(__dirname, "../www");
const appDir = path.resolve(process.env.APP_DIR || defaultAppDir);
const data = JSON.parse(fs.readFileSync(path.join(appDir, "ags-workbook.json"), "utf8"));
const resources = data.subjects.flatMap(subject => subject.resources.map(resource => ({ subject, resource })));
const lessons = resources.filter(item => item.resource.type === "lesson");
const tests = resources.filter(item => item.resource.type === "test");
const questions = tests.flatMap(item => item.resource.questions);

assert.deepEqual(data.stats, {
  physicalPages: 40,
  subjects: 6,
  lessonSheets: 12,
  tests: 12,
  questions: 81,
  officialSolutions: 81,
});
assert.equal(data.pages.length, 40);
assert.equal(data.subjects.length, 6);
assert.equal(lessons.length, 12);
assert.equal(tests.length, 12);
assert.equal(questions.length, 81);
assert.equal(new Set(questions.map(question => question.id)).size, 81, "Soru kimlikleri benzersiz olmalı");

lessons.forEach(({ resource }) => {
  assert.ok(resource.text.length > 2500, `${resource.id}: konu metni eksik`);
  assert.ok(fs.statSync(path.join(appDir, resource.image)).size > 1000, `${resource.image}: sayfa görseli eksik`);
});
tests.forEach(({ resource }) => {
  assert.deepEqual(resource.questions.map(question => question.number), Array.from({ length: resource.questions.length }, (_, index) => index + 1), `${resource.id}: soru sırası bozuk`);
  assert.ok(fs.statSync(path.join(appDir, resource.image)).size > 1000, `${resource.image}: test görseli eksik`);
});
questions.forEach(question => {
  assert.ok(question.question.length > 20, `${question.id}: soru kökü eksik`);
  assert.deepEqual(Object.keys(question.choices), ["A", "B", "C", "D", "E"], `${question.id}: beş şık bulunmalı`);
  Object.values(question.choices).forEach(choice => assert.ok(choice.length > 0, `${question.id}: boş şık`));
  assert.ok(question.choices[question.answer], `${question.id}: doğru cevap şıkkı yok`);
  assert.match(question.explanation, new RegExp(`Doğru cevap ${question.answer} seçeneğidir`, "i"), `${question.id}: resmî çözüm/cevap eşleşmiyor`);
  assert.match(question.officialSolutionUrl, /^https:\/\/www\.editoryayinevi\.net\/qr\/226\//);
});
data.pages.forEach((page, index) => {
  assert.equal(page.number, index + 1);
  const imagePath = path.join(appDir, page.image);
  assert.ok(fs.existsSync(imagePath), `${page.image}: bulunamadı`);
  assert.ok(fs.statSync(imagePath).size > 500, `${page.image}: geçersiz görsel`);
});

const pdfPath = path.join(appDir, data.originalPdf);
assert.ok(fs.statSync(pdfPath).size > 1_000_000, "Orijinal PDF eksik");
if (process.env.SOURCE_PDF) {
  const digest = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  assert.equal(digest(pdfPath), digest(process.env.SOURCE_PDF), "Uygulamadaki PDF kaynak dosyayla birebir değil");
}

console.log("AGS içerik bütünlüğü: 40 sayfa, 12 konu, 12 test, 81 soru ve 81 resmî çözüm doğrulandı.");
