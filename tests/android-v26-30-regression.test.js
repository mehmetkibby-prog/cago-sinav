const fs = require("fs");
const path = require("path");
const assert = require("assert");

const root = path.resolve(__dirname, "..");
const notes = fs.readFileSync(path.join(root, "www/android-study-notes.js"), "utf8");
const css = fs.readFileSync(path.join(root, "www/android-tablet-notes.css"), "utf8");
const html = fs.readFileSync(path.join(root, "www/index.html"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/main.yml"), "utf8");

assert(notes.includes("isEditingText()"), "Android input focus guard is missing");
assert(notes.includes("clearSelectionToolbar(false)"), "Focused input range can still be cleared");
assert(notes.includes(".message.ai") && notes.includes("#app"), "Selection is not available across teaching content");
assert(notes.includes("INTERACTIVE_SELECTOR"), "Interactive controls are not excluded from saved selections");
assert(css.includes(".ags-workbook-toolbar{position:relative!important;top:auto!important}"), "AGS toolbar can still overlap content");
assert(css.includes("grid-template-columns:1fr!important"), "AGS tablet grids are not forced to a safe single column");
assert(css.includes("overflow-x:hidden"), "AGS horizontal layout containment is missing");
assert(html.includes("V26.30"), "Android UI version was not updated");
assert(workflow.includes("V26.30-2026-Soru-Kaynaklari-APK"), "APK artifact name was not updated");

console.log("Android V26.30 regression checks passed.");
