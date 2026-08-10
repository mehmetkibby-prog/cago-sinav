const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const styles = fs.readFileSync(path.join(root, "www/styles.css"), "utf8");
const mobile = fs.readFileSync(path.join(root, "www/mobile.css"), "utf8");
const tablet = fs.readFileSync(path.join(root, "www/android-tablet-notes.css"), "utf8");

assert.match(styles, /body>header\{height:82px/,
  "Ana uygulama başlığı body çocuğu olarak kapsamlanmamış");
assert.doesNotMatch(styles, /(^|[},])header\{height:82px/,
  "Genel header kuralı AGS iç başlıklarına hâlâ sızıyor");
assert.ok(mobile.includes("body>header{height:auto"),
  "Telefon/tablet başlık kuralı yalnız ana başlığa kapsamlanmamış");
assert.doesNotMatch(mobile, /(^|\n)\s*header\{/m,
  "Mobil CSS içinde kapsamlanmamış header kuralı kaldı");

[
  "position:static!important",
  "height:auto!important",
  "min-height:0!important",
  "max-height:none!important",
  "grid-template-columns:repeat(auto-fit,minmax(180px,1fr))",
  "overflow:visible!important",
  ".ags-resource-card b{color:#f4f9ff!important}",
].forEach(fragment => assert.ok(tablet.includes(fragment), `AGS tablet koruması eksik: ${fragment}`));

console.log("Android AGS kart başlığı ve konu filtreleri akış/taşma testleri geçti.");
