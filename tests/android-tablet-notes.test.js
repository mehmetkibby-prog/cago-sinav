const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const mustContain = (relative, fragments) => {
  const source = read(relative);
  fragments.forEach(fragment => assert.ok(source.includes(fragment), `${relative} içinde eksik: ${fragment}`));
  return source;
};

const index = mustContain("www/index.html", [
  "V26.31 · Android Tablet",
  "android-tablet-notes.css",
  "android-study-notes.js",
]);
assert.ok(index.indexOf("android-tablet-notes.css") > index.indexOf("mobile.css"), "Tablet düzeltme CSS'i en son yüklenmeli");
assert.ok(index.indexOf("android-study-notes.js") < index.indexOf("app.js"), "Cümle kaydetme API'si ana uygulamadan önce yüklenmeli");

const notes = mustContain("www/android-study-notes.js", [
  'const STORAGE_KEY = "savedLessonSentencesV1"',
  ".selectable-study-text, .lesson-output, #topic-lesson-content, .ags-lesson-text",
  'document.addEventListener("selectionchange"',
  "function savePendingSelection()",
  "Bu cümle zaten kayıtlı.",
  "function renderSavedSentences()",
  "Kaydettiğim Cümleler",
  "globalThis.savedLessonSentences",
  "globalThis.renderSavedSentences",
]);
new vm.Script(notes, { filename: "android-study-notes.js" });

const app = mustContain("www/app.js", [
  'data-go="saved-sentences"',
  '"saved-sentences":renderSavedSentences',
  "selectable-study-text",
  "sentence-save-hint",
  "V26.31 · Android Tablet",
]);
new vm.Script(app, { filename: "app.js" });

const workbook = mustContain("www/ags-workbook.js", [
  "Tablet için akıcı metin görünümü",
  'class="ags-lesson-text selectable-study-text"',
  "Cümleyi Kaydet",
  "<header><div><small>",
]);
new vm.Script(workbook, { filename: "ags-workbook.js" });

mustContain("www/android-tablet-notes.css", [
  ".ags-lesson-reader>header{display:block!important}",
  ".ags-workbook-toolbar{position:relative!important;top:auto!important}",
  "@media(min-width:601px) and (max-width:900px)",
  ".ags-resource-grid,.ags-test-grid{grid-template-columns:1fr}",
  ".ags-subject-card>header{",
  "height:auto!important",
  "position:static!important",
  "grid-template-columns:repeat(auto-fit,minmax(180px,1fr))",
  ".sentence-save-toolbar",
  "-webkit-user-select:text!important",
]);

console.log("Android tablet: AGS yazı çakışması ve seçili cümle kaydetme bölümü doğrulandı.");
