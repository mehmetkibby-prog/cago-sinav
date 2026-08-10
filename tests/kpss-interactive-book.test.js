const fs=require('fs');
const assert=require('assert');
const bank=JSON.parse(fs.readFileSync('www/education-library/kpss-question-bank.json','utf8'));
const lib=fs.readFileSync('www/education-library.js','utf8');
const app=fs.readFileSync('www/app.js','utf8');
assert.strictEqual(bank.totalPages,208);
assert.strictEqual(bank.tests.length,103);
assert.strictEqual(bank.questionCount,1233);
assert.strictEqual(bank.questions.length,1233);
assert.strictEqual(new Set(bank.questions.map(q=>q.id)).size,1233);
for(const q of bank.questions){
  assert(q.question && q.answer && q.choices[q.answer],q.id);
  for(const k of ['A','B','C','D','E']) assert(q.choices[k],`${q.id}:${k}`);
  assert(q.sourcePage>=3 && q.sourcePage<=208,q.id);
}
assert(lib.includes('renderKpssQuestionBank'));
assert(lib.includes('kpss-question-bank.json'));
assert(app.includes('Orijinal kitap sayfasını göster'));
console.log('KPSS 208 sayfa: 103 test ve 1233 etkileşimli soru doğrulandı.');
