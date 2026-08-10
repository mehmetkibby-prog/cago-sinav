const fs = require("fs");
const path = require("path");
const assert = require("assert");

const app = fs.readFileSync(path.join(__dirname, "../www/app.js"), "utf8");

assert(app.includes("real2026CandidateSchema(job.count,focusKeys,angleKeys,true)"), "2026 kaynak şeması zorunlu değil");
assert(app.includes("normalizeReal2026Question(q,job,index,i,true)"), "2026 kaynak doğrulaması çalışmıyor");
assert(app.includes("webSearch:true"), "2026 üretiminde web araştırması kapalı");
assert(app.includes("sources:q.verificationSources"), "Doğrulanan kaynaklar soru kaydına taşınmıyor");
assert(app.includes("Kaynaklar cevaplandıktan sonra açılacak"), "Kaynak kilidi eksik");
assert(app.includes("lockedSources.outerHTML=questionSourcesHtml(q)"), "Cevaptan sonra kaynak açılmıyor");
assert(app.includes("Kaynak: ${sources.map"), "Yazdırılabilir PDF kaynakları içermiyor");
assert(!app.includes("URL veya verificationSources üretme"), "Eski kaynaksız üretim talimatı hâlâ etkin");
assert(app.includes("Wikipedia dışında en az bir resmî"), "Wikipedia'nın yalnız destekleyici kaynak olma kuralı eksik");

console.log("V26.32 2026 soru bazlı kaynak testleri geçti.");
