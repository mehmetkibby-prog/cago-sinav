const $ = s => document.querySelector(s);
const app = $("#app");
const state = { data:null, educationData:null, route:"home", section:null, exam:[], index:0, correct:0, wrong:0, answered:false, examTitle:"", examResults:[], questionStartedAt:0, customExam:null, simulation:null, simulationTimer:null, rtc:null, voiceStream:null, voiceAudio:null, voiceChannel:null, voiceLesson:null, questionAudio:null, questionAudioUrl:"", questionVoiceCache:new Map(), chat:[], studyChat:[], aiQuestionExplanations:{}, aiSimilarQuestions:{}, aiTopicLessons:{}, aiDistractorAnalyses:{}, eliminatedChoices:{}, eliminationMode:false, activeReport:null };
const store = {
  get(k,f){ try { return JSON.parse(localStorage.getItem(k)) ?? f; } catch { return f; } },
  set(k,v){ localStorage.setItem(k,JSON.stringify(v)); }
};
function savedTests(){return store.get("savedTests",[]).filter(x=>x&&x.id&&Array.isArray(x.questions)&&x.questions.length)}
function writeSavedTest(snapshot){
  const items=savedTests(),at=items.findIndex(x=>x.id===snapshot.id);
  if(at<0)items.unshift(snapshot);else items[at]=snapshot;
  store.set("savedTests",items.slice(0,50));
}
function savedTestId(){return `test-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
function saveCurrentExam(){
  const oldId=state.activeSavedTestId,id=oldId||savedTestId();state.activeSavedTestId=id;
  writeSavedTest({
    id,type:"normal",title:state.examTitle||"Kayıtlı Test",
    questions:state.exam,index:state.index,correct:state.correct,wrong:state.wrong,
    answered:state.answered,results:state.examResults,eliminatedChoices:state.eliminatedChoices,
    createdAt:oldId?(savedTests().find(x=>x.id===oldId)?.createdAt||new Date().toISOString()):new Date().toISOString(),
    updatedAt:new Date().toISOString()
  });
  toast(oldId?"Test kaydı güncellendi":"Test Kayıtlı Testler bölümüne kaydedildi");
}
function saveCurrentSimulation(){
  const s=state.simulation;if(!s)return;
  commitSimulationQuestionTime();
  const oldId=state.activeSavedTestId,id=oldId||savedTestId(),remainingMs=Math.max(0,s.endsAt-Date.now());state.activeSavedTestId=id;
  writeSavedTest({
    id,type:"simulation",title:s.title||"Kayıtlı Sınav",
    questions:s.questions,index:s.index,answers:s.answers,marked:s.marked,timeSpent:s.timeSpent,
    minutes:s.minutes,remainingMs,eliminatedChoices:state.eliminatedChoices,
    createdAt:oldId?(savedTests().find(x=>x.id===oldId)?.createdAt||new Date().toISOString()):new Date().toISOString(),
    updatedAt:new Date().toISOString()
  });
  toast(oldId?"Test kaydı güncellendi":"Test Kayıtlı Testler bölümüne kaydedildi");
}
function resumeSavedTest(id){
  const item=savedTests().find(x=>x.id===id);if(!item)return toast("Kayıtlı test bulunamadı.");
  state.activeSavedTestId=item.id;
  state.eliminatedChoices=item.eliminatedChoices||{};state.eliminationMode=false;
  if(item.type==="simulation"){
    clearInterval(state.simulationTimer);
    state.simulation={questions:item.questions,answers:item.answers||{},marked:item.marked||[],timeSpent:item.timeSpent||{},activeQuestionId:null,questionEnteredAt:0,index:Math.min(item.index||0,item.questions.length-1),startedAt:Date.now(),endsAt:Date.now()+Math.max(1000,item.remainingMs??item.minutes*60000),minutes:item.minutes||60,title:item.title};
    renderSimulationQuestion();
    state.simulationTimer=setInterval(()=>{const s=state.simulation;if(!s)return clearInterval(state.simulationTimer);if(Date.now()>=s.endsAt)finishSimulation(true);else updateSimulationClock()},1000);
    return;
  }
  Object.assign(state,{exam:item.questions,index:Math.min(item.index||0,item.questions.length-1),correct:item.correct||0,wrong:item.wrong||0,answered:Boolean(item.answered),examTitle:item.title||"Kayıtlı Test",examResults:item.results||[],questionStartedAt:Date.now()});
  renderQuestion();
}
function removeSavedTest(id){
  if(!confirm("Bu kayıtlı test silinsin mi?"))return;
  store.set("savedTests",savedTests().filter(x=>x.id!==id));renderSavedTests();
}
function renderSavedTests(){
  const items=savedTests();
  setTitle("Kayıtlı Testler",`${items.length} kayıt`,true);
  app.innerHTML=items.length?`<div class="saved-test-list">${items.map(x=>{
    const answered=x.type==="simulation"?Object.keys(x.answers||{}).length:(x.results||[]).length;
    const detail=x.type==="simulation"?`${answered} / ${x.questions.length} cevaplandı · ${Math.max(1,Math.ceil((x.remainingMs||0)/60000))} dk kaldı`:`${answered} / ${x.questions.length} soru tamamlandı`;
    return `<article class="saved-test-card"><div><small>${x.type==="simulation"?"Sınav modu":"Açıklamalı test"}</small><h3>${esc(x.title)}</h3><p>${detail}<br>${new Date(x.updatedAt||x.createdAt).toLocaleString("tr-TR")}</p></div><div class="saved-test-actions"><button class="primary" data-resume="${x.id}">Devam Et</button><button class="danger" data-delete="${x.id}">Sil</button></div></article>`;
  }).join("")}</div>`:`<section class="hero"><h2>Henüz kayıtlı test yok</h2><p>Bir test ekranındaki “Testi Kaydet” düğmesine bastığında burada görünür.</p></section>`;
  document.querySelectorAll("[data-resume]").forEach(b=>b.onclick=()=>resumeSavedTest(b.dataset.resume));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>removeSavedTest(b.dataset.delete));
}
if(!store.get("v24_4k_fast_model",false)){store.set("aiModel","gpt-4.1-mini");store.set("v24_4k_fast_model",true)}
const esc = (t="") => String(t).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const shuffle = xs => { const a=[...xs]; for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]} return a; };
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1900)}
function offlineEducationSections(){return state.educationData?.sections||[]}
function offlineEducationQuestions(){return offlineEducationSections().flatMap(s=>s.questions)}
function allQuestions(){return [...state.data.sections.flatMap(s=>s.questions),...offlineEducationQuestions()]}
function ids(key){return new Set(store.get(key,[]))}
function validQuestionSnapshot(q){return Boolean(q&&q.id&&q.question&&q.choices&&q.answer&&q.choices[q.answer])}
function savedHardQuestions(){
  const stored=store.get("hardQuestionItems",[]).filter(validQuestionSnapshot),byId=new Map(stored.map(q=>[q.id,q]));
  const legacyIds=ids("hardQuestions");
  allQuestions().forEach(q=>{if(legacyIds.has(q.id)&&!byId.has(q.id))byId.set(q.id,q)});
  const items=[...byId.values()];
  if(items.length!==stored.length)store.set("hardQuestionItems",items);
  if(items.some(q=>!legacyIds.has(q.id)))store.set("hardQuestions",[...new Set([...legacyIds,...items.map(q=>q.id)])]);
  return items;
}
function hardQuestionIds(){return new Set([...ids("hardQuestions"),...savedHardQuestions().map(q=>q.id)])}
function toggleHardQuestion(q,on){
  const item={...q,savedAsHardAt:new Date().toISOString()},items=savedHardQuestions(),at=items.findIndex(x=>x.id===q.id),idSet=hardQuestionIds();
  if(on){if(at<0)items.unshift(item);else items[at]=item;idSet.add(q.id)}
  else{if(at>=0)items.splice(at,1);idSet.delete(q.id)}
  store.set("hardQuestionItems",items.slice(0,1000));store.set("hardQuestions",[...idSet]);
  toast(on?"Soru Zor Sorular bölümüne kaydedildi":"Soru Zor Sorular bölümünden çıkarıldı");
}
function setTitle(t,s="V26.28 · Android Tablet",back=false){$("#page-title").textContent=t;$("#subtitle").textContent=s;$("#back").classList.toggle("hidden",!back)}
function nav(r){if(typeof clearSelectionToolbar==="function")clearSelectionToolbar();if(state.voiceLesson?.playing)stopWrongVoiceLesson(false);state.route=r;document.querySelectorAll("#bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.route===r));({home:renderHome,wrong:renderWrong,stats:renderStats,voice:renderVoice,more:renderMore,settings:renderSettings}[r]||renderHome)()}

function renderHome(){
  const p=store.get("profile",{name:"Çağlar",examDate:""});
  const savedSentenceCount=typeof savedLessonSentences==="function"?savedLessonSentences().length:0;
  setTitle("Müzik Sınavı",p.name?`Hoş geldin, ${p.name}`:"V24 Android");
  app.innerHTML=`<section class="hero"><h2>Sınava hazırlan</h2><p>${allQuestions().length} soruluk bankadan çalış, yanlışlarını tekrar çöz ve gelişimini izle.</p>
  <div class="actions"><button class="primary" id="real-music-2026">2026 Gerçek Müzik Sınavı Tarzı</button><button class="secondary" id="mixed">Karışık Deneme</button><button class="secondary khk-2025-button" id="khk-music-2025">2025 Müzik Alanı Tarzı Deneme</button><button class="secondary custom-exam-button" id="custom-exam">Özel Deneme Oluştur</button><button class="secondary" id="real-exam">Gerçek Sınav Simülasyonu</button><button class="secondary music-ai-button" id="music-ai">AI Müzik Soru Oluştur</button><button class="secondary ags-workbook-button" id="ags-workbook">AGS Eğitim Bilimleri Kitabı</button><button class="secondary offline-education-button" id="offline-education">Eğitim Bilimleri</button><button class="secondary education-button" id="education-center">AI Eğitim Bilimleri Merkezi</button><button class="secondary" id="ai-exam">AI Eğitim Bilimleri</button><button class="secondary opera-ballet-button" id="opera-ballet">AI Opera ve Bale</button><button class="secondary ai-center-button" id="ai-center">AI Destekli Çalışma Merkezi</button></div></section>
  <div class="feature-grid">
    <button class="card feature" data-go="teacher"><b>🤖 AI Öğretmen</b><span>Sor, öğren, mini sınav yap</span></button>
    <button class="card feature" data-go="cards"><b>🗂 Ezber Kartları</b><span>Kart çevirerek tekrar et</span></button>
    <button class="card feature memory-feature" data-go="memory"><b>🧠 Yoğun Ezber Soruları</b><span>Eser–besteci, dönem ve ağır bilgi soruları</span></button>
    <button class="card feature ags-workbook-feature" data-go="ags-workbook"><b>📗 AGS Eğitim Bilimleri Kitabı</b><span>40 sayfa · 12 konu · 81 soru ve resmî çözüm</span></button>
    <button class="card feature saved-sentences-feature" data-go="saved-sentences"><b>📌 Kaydettiğim Cümleler</b><span>${savedSentenceCount} kayıt · konu anlatımından seçtiklerin</span></button>
    <button class="card feature offline-education-feature" data-go="offline-education"><b>📘 Eğitim Bilimleri</b><span>${offlineEducationQuestions().length} çevrimdışı soru · AI gerektirmez</span></button>
    <button class="card feature education-feature" data-go="education"><b>🎓 AI Eğitim Bilimleri</b><span>MEB, YÖK, üniversite ve akademik kaynak doğrulamalı</span></button>
    <button class="card feature music-ai-feature" data-go="music-ai"><b>🎼 AI Müzik Soru Oluşturucu</b><span>Tüm dönemler, Türk müziği, çalgılar, teori ve formlar</span></button>
    <button class="card feature khk-2025-feature" data-go="khk-music-2025"><b>🎯 2025 Müzik Alanı Tarzı Deneme</b><span>70 soruluk KHK profilinde, beş seçenekli özgün alan sınavı</span></button>
    <button class="card feature khk-2025-feature" data-go="real-music-2026"><b>🏆 2026 Gerçek Müzik Sınavı Tarzı</b><span>Sınavdan hatırladığın soru türlerine göre AI yeni sorular üretir</span></button>
    <button class="card feature music-report-feature" data-go="music-wrong-ai"><b>🧬 AI Müzik Yanlışları</b><span>Yanlışlarından kişisel özet ve yazdırılabilir PDF hazırla</span></button>
    <button class="card feature workbook-feature" data-go="workbook"><b>📕 Kişisel Çalışma Kitabı</b><span>Yanlışlarından konu özeti, etkinlik ve yazdırılabilir kitapçık</span></button>
    <button class="card feature voice-lesson-feature" data-go="wrong-voice-lesson"><b>🎧 Yanlışlardan Sesli Ders</b><span>Not alma durakları ve ayarlanabilir konuşma hızı</span></button>
    <button class="card feature forgetting-feature" data-go="forgetting-risk"><b>⏳ Bugün Hatırlaman Gerekenler</b><span>Unutma riski yükselen bilgileri zamanında tekrar et</span></button>
    <button class="card feature saved-tests-feature" data-go="saved-tests"><b>💾 Kayıtlı Testler</b><span>Kaydettiğin testlere kaldığın yerden devam et</span></button>
    <button class="card feature custom-exam-feature" data-go="custom-exam"><b>🧩 Deneme Oluşturucu</b><span>Bölümleri ve soru sayılarını kendin birleştir</span></button>
    <button class="card feature" data-go="study"><b>📚 Konu Çalışma Köşesi</b><span>Plan ve notlarını tut</span></button>
    <button class="card feature" data-go="profile"><b>👤 Kişisel Bilgi Köşesi</b><span>Hedeflerini düzenle</span></button>
  </div>
  <h3 class="section-title">Soru Bankası</h3><div class="grid">${state.data.sections.map(s=>`<button class="card section" data-id="${s.id}"><b>${esc(s.title)}</b><span class="pill">${s.questions.length} soru</span></button>`).join("")}</div>`;
  $(".feature-grid").onclick=e=>{const b=e.target.closest("[data-go]");if(b)({teacher:renderTeacher,cards:renderFlashcards,memory:renderMemoryCenter,"ags-workbook":()=>EBWorkbook.render(),"saved-sentences":renderSavedSentences,"offline-education":renderOfflineEducation,education:renderEducationCenter,"music-ai":renderMusicQuestionGenerator,"khk-music-2025":renderKhkMusic2025Generator,"real-music-2026":renderRealMusic2026Generator,"music-wrong-ai":renderMusicWrongAnalysis,workbook:renderPersonalWorkbook,"wrong-voice-lesson":renderWrongVoiceLesson,"forgetting-risk":renderForgettingRisk,"saved-tests":renderSavedTests,"custom-exam":renderCustomExamBuilder,study:renderStudy,profile:renderProfile}[b.dataset.go])()};
  document.querySelectorAll(".section").forEach(b=>b.onclick=()=>renderSection(b.dataset.id));
  $("#mixed").onclick=()=>startExam(shuffle(allQuestions()).slice(0,Math.min(50,allQuestions().length)),"Karışık Deneme");
  $("#custom-exam").onclick=renderCustomExamBuilder;
  $("#real-exam").onclick=renderSimulationSetup;
  $("#music-ai").onclick=renderMusicQuestionGenerator;
  $("#khk-music-2025").onclick=renderKhkMusic2025Generator;
  $("#real-music-2026").onclick=renderRealMusic2026Generator;
  $("#ags-workbook").onclick=()=>EBWorkbook.render();
  $("#offline-education").onclick=renderOfflineEducation;
  $("#education-center").onclick=renderEducationCenter;
  $("#ai-exam").onclick=renderAiExam;
  $("#opera-ballet").onclick=renderOperaBallet;
  $("#ai-center").onclick=renderAiStudyCenter;
}
function renderSection(id){
  const s=state.data.sections.find(x=>x.id===id);state.section=s;setTitle(s.title,`${s.questions.length} soru`,true);
  const counts=[5,10,15,20,30,50,s.questions.length].filter((v,i,a)=>v<=s.questions.length&&a.indexOf(v)===i);
  app.innerHTML=`<section class="hero"><h2>${esc(s.title)}</h2><p>Soru sayısını seçerek denemeyi başlat.</p>
  <label>Soru sayısı</label><select id="count">${counts.map(v=>`<option value="${v}">${v===s.questions.length?"Tümü":v}</option>`).join("")}</select>
  <div class="actions"><button class="primary" id="begin">Sınavı Başlat</button><button class="secondary" id="inspect">Soruları İncele</button></div></section>`;
  $("#begin").onclick=()=>startExam(shuffle(s.questions).slice(0,+$("#count").value),s.title);
  $("#inspect").onclick=()=>renderQuestionList(s.questions,s.title);
}
function renderOfflineEducation(){
  const sections=offlineEducationSections(),total=offlineEducationQuestions().length,source=state.educationData?.source||{};
  setTitle("Eğitim Bilimleri",`${total} çevrimdışı soru`,true);
  app.innerHTML=`<section class="hero offline-education-hero"><h2>Eğitim Bilimleri Bankası</h2><p>Önceki deneme, KHK Çalışma Soruları 2025 ve Hoca Kafası 2026 ücretsiz soru bankası çevrimdışı olarak aktarılmıştır. Hoca Kafası sorularında kitaptaki ayrıntılı çözümler bulunur.</p><div class="actions"><button class="primary" id="offline-all">Tüm Sorulardan Deneme</button><button class="secondary" id="offline-inspect">Tüm Soruları İncele</button></div><small>Çevrimdışı kaynaklar · ${total} doğrulanmış soru</small></section>
  <div class="offline-education-grid">${sections.map(s=>`<button class="card offline-education-section" data-id="${s.id}"><b>${esc(s.title)}</b><span class="pill">${s.questions.length} soru</span></button>`).join("")}</div>`;
  $("#offline-all").onclick=()=>startExam(shuffle(offlineEducationQuestions()),"Eğitim Bilimleri PDF Denemesi");
  $("#offline-inspect").onclick=()=>renderQuestionList(offlineEducationQuestions(),"Eğitim Bilimleri PDF Soruları");
  document.querySelectorAll(".offline-education-section").forEach(b=>b.onclick=()=>renderOfflineEducationSection(b.dataset.id));
}
function renderOfflineEducationSection(id){
  const section=offlineEducationSections().find(x=>x.id===id);
  if(!section)return renderOfflineEducation();
  setTitle(section.title,`${section.questions.length} çevrimdışı soru`,true);
  const counts=[5,10,15,20,section.questions.length].filter((v,i,a)=>v<=section.questions.length&&a.indexOf(v)===i);
  app.innerHTML=`<section class="hero offline-education-hero"><h2>${esc(section.title)}</h2><p>Kaynaklardan aktarılan çevrimdışı sorular. Ayrıntılı çözümü bulunan sorularda test sırasında çözüm düğmesi görünür.</p><label>Soru sayısı</label><select id="offline-count">${counts.map(v=>`<option value="${v}">${v===section.questions.length?"Tümü":v}</option>`).join("")}</select><div class="actions"><button class="primary" id="offline-start">Sınavı Başlat</button><button class="secondary" id="offline-list">Soruları İncele</button></div></section>`;
  $("#offline-start").onclick=()=>startExam(shuffle(section.questions).slice(0,+$("#offline-count").value),section.title);
  $("#offline-list").onclick=()=>renderQuestionList(section.questions,section.title);
}
function safeHttpUrl(value){
  try{const url=new URL(String(value));return ["https:","http:"].includes(url.protocol)?url.href:""}catch(_){return ""}
}
function trustedEducationSourceUrl(value){
  const href=safeHttpUrl(value);if(!href)return "";
  const host=new URL(href).hostname.toLowerCase();
  const trusted=host==="dergipark.org.tr"||host.endsWith(".dergipark.org.tr")||host==="trdizin.gov.tr"||host.endsWith(".trdizin.gov.tr")||host==="meb.gov.tr"||host.endsWith(".meb.gov.tr")||host==="yok.gov.tr"||host.endsWith(".yok.gov.tr")||host.endsWith(".edu.tr");
  return trusted?href:"";
}
function trustedQuestionStyleUrl(value){
  const href=safeHttpUrl(value);if(!href)return "";
  const host=new URL(href).hostname.toLowerCase().replace(/^www\./,"");
  const trusted=host==="sinavtime.com"||host==="onlinesoru.com"||host==="sorumarket.com"||host==="sinavcoz.com"||host==="pegem.net"||host.endsWith(".pegem.net")||host==="pegemakademi.com"||host.endsWith(".pegemakademi.com");
  return trusted?href:"";
}
function questionSourcesHtml(q){
  const sources=Array.isArray(q?.sources)?q.sources:(Array.isArray(q?.verificationSources)?q.verificationSources:[]),style=q?.styleSource;
  if(!sources.length&&!style)return "";
  const verified=sources.map(source=>{
    const name=esc(source.name||"Kaynak"),url=safeHttpUrl(source.url);
    return url?`<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${name}</a></li>`:`<li>${name}</li>`;
  }).join("");
  const styleUrl=safeHttpUrl(style?.url),styleName=esc(style?.name||"Soru biçimi örneği");
  return `<aside class="question-sources"><b>🔎 Bu sorunun kaynakları</b>${verified?`<small>Bilgi doğrulaması</small><ul>${verified}</ul>`:""}${style?`<small>Yalnız soru biçimi/çeşidi örneği</small><div>${styleUrl?`<a href="${esc(styleUrl)}" target="_blank" rel="noopener noreferrer">${styleName}</a>`:styleName}</div>`:""}</aside>`;
}
function renderQuestionList(qs,title){setTitle(title,"Cevaplı çalışma listesi",true);app.innerHTML=`<div class="list">${qs.map((q,i)=>`<article class="list-item"><h3>${i+1}. ${esc(q.question)}</h3><div class="muted">Doğru cevap: <b>${q.answer}) ${esc(q.choices[q.answer])}</b></div>${q.explanation?`<p>${esc(q.explanation)}</p>`:""}${questionSourcesHtml(q)}</article>`).join("")}</div>`}
function startExam(qs,title){
  if(!qs.length)return toast("Bu listede soru yok.");
  Object.assign(state,{exam:qs,index:0,correct:0,wrong:0,answered:false,examTitle:title,examResults:[],questionStartedAt:Date.now(),eliminatedChoices:{},eliminationMode:false,activeSavedTestId:null});renderQuestion();
}
function renderQuestion(){
  cancelVoiceEngine();
  const q=state.exam[state.index],hard=hardQuestionIds().has(q.id),pct=Math.round(state.index/state.exam.length*100),hasSolution=Boolean(q.explanation?.trim()),eliminated=eliminatedChoiceSet(q);
  setTitle(state.examTitle,`Soru ${state.index+1} / ${state.exam.length}`,true);
  app.innerHTML=`<div class="exam-head"><span class="pill">Doğru ${state.correct} · Yanlış ${state.wrong}</span><div class="exam-head-actions"><button class="secondary save-test-button" id="save-test">💾 Testi Kaydet</button><label class="hard-toggle"><input id="hard-check" type="checkbox" ${hard?"checked":""}> ★ Zor</label></div></div>
  <div class="progress"><i style="width:${pct}%"></i></div><div class="question">${esc(q.question)}</div>
  ${questionSourcesHtml(q)}
  ${questionVoiceButtonHtml()}
  ${choiceEliminationHtml()}
  <div>${Object.entries(q.choices).map(([k,v])=>`<button class="choice original-choice ${eliminated.has(k)?"eliminated":""}" data-key="${k}"><strong>${k}</strong><span>${esc(v)}</span></button>`).join("")}</div>
  ${hasSolution?`<div class="solution-actions"><button class="secondary solution-toggle" id="solution-toggle" aria-expanded="false">📖 Ayrıntılı Çözümü Göster</button></div><div class="solution-box hidden" id="solution-box"><b>${q.sources?.length?"Gerekçeli Çözüm":"Kitaptaki Ayrıntılı Çözüm"}</b><p>${esc(q.explanation)}</p></div>`:""}
  ${topicLessonHtml()}
  ${aiQuestionSolutionHtml()}
  ${similarQuestionHtml()}
  <div id="feedback"></div><div class="actions"><button class="primary hidden" id="next">${state.index===state.exam.length-1?"Sınavı Bitir":"Sonraki Soru"}</button></div>`;
  $("#hard-check").onchange=e=>toggleHardQuestion(q,e.target.checked);
  $("#save-test").onclick=saveCurrentExam;
  mountQuestionVoice(q);
  if(hasSolution)$("#solution-toggle").onclick=()=>{
    const box=$("#solution-box"),button=$("#solution-toggle"),opening=box.classList.contains("hidden");
    box.classList.toggle("hidden",!opening);button.setAttribute("aria-expanded",String(opening));
    button.textContent=opening?"📕 Ayrıntılı Çözümü Gizle":"📖 Ayrıntılı Çözümü Göster";
  };
  mountTopicLesson(q,{warnBeforeReveal:()=>!state.answered});
  mountAiQuestionSolution(q,{warnBeforeReveal:()=>!state.answered});
  mountSimilarQuestion(q);
  mountChoiceElimination(q,key=>answer(key),{isLocked:()=>state.answered});
  $("#next").onclick=()=>{if(++state.index>=state.exam.length)finishExam();else{state.answered=false;state.questionStartedAt=Date.now();renderQuestion()}};
  if(state.answered){
    const result=[...state.examResults].reverse().find(x=>questionStateKey(x.q)===questionStateKey(q));
    if(result){
      document.querySelectorAll(".original-choice").forEach(b=>{b.disabled=true;if(b.dataset.key===q.answer)b.classList.add("correct");else if(b.dataset.key===result.selected)b.classList.add("wrong")});
      if($("#elimination-toggle"))$("#elimination-toggle").disabled=true;
      $("#feedback").innerHTML=`<div class="result"><b>${result.ok?"Doğru!":"Yanlış."}</b>${!result.ok?`<br>Doğru cevap: ${q.answer}) ${esc(q.choices[q.answer])}`:""}</div>`;
      $("#next").classList.remove("hidden");
    }
  }
}
function questionStateKey(q){return String(q?.id||q?.question||"question")}
function eliminatedChoiceSet(q){return new Set(state.eliminatedChoices[questionStateKey(q)]||[])}
function choiceEliminationHtml(){
  return `<div class="elimination-actions"><button class="secondary elimination-toggle ${state.eliminationMode?"active":""}" id="elimination-toggle" aria-pressed="${state.eliminationMode}">✂ Şık Eleme: ${state.eliminationMode?"Açık":"Kapalı"}</button><small>${state.eliminationMode?"Eleyeceğin şıklara dokun.":"Açınca şıklara dokunarak üzerini çizebilirsin."}</small></div>`;
}
function mountChoiceElimination(q,onSelect,options={}){
  const toggle=$("#elimination-toggle"),choices=[...document.querySelectorAll(".original-choice")];
  if(!toggle)return;
  const refreshToggle=()=>{
    toggle.classList.toggle("active",state.eliminationMode);
    toggle.setAttribute("aria-pressed",String(state.eliminationMode));
    toggle.textContent=`✂ Şık Eleme: ${state.eliminationMode?"Açık":"Kapalı"}`;
    const note=toggle.parentElement?.querySelector("small");
    if(note)note.textContent=state.eliminationMode?"Eleyeceğin şıklara dokun.":"Açınca şıklara dokunarak üzerini çizebilirsin.";
  };
  toggle.onclick=()=>{
    if(options.isLocked?.())return;
    state.eliminationMode=!state.eliminationMode;
    refreshToggle();
  };
  choices.forEach(button=>button.onclick=()=>{
    if(options.isLocked?.())return;
    const key=button.dataset.key;
    if(!state.eliminationMode)return onSelect(key);
    const eliminated=eliminatedChoiceSet(q);
    eliminated.has(key)?eliminated.delete(key):eliminated.add(key);
    state.eliminatedChoices[questionStateKey(q)]=[...eliminated];
    button.classList.toggle("eliminated",eliminated.has(key));
  });
}
function isEducationQuestion(q){return Boolean(q?.educationArea)}
function wrongStoreKey(q){return isEducationQuestion(q)?"wrongEducationQuestions":"wrongMusicQuestions"}
function savedWrongQuestions(key){return store.get(key,[]).filter(q=>q&&q.id&&q.question&&q.choices&&q.answer)}
function saveWrongQuestion(q){
  const key=wrongStoreKey(q),items=savedWrongQuestions(key),at=items.findIndex(x=>x.id===q.id);
  if(at<0)items.unshift(q);else items[at]=q;
  store.set(key,items.slice(0,1000));
}
function removeWrongQuestion(q){
  const key=wrongStoreKey(q);
  store.set(key,savedWrongQuestions(key).filter(x=>x.id!==q.id));
}
function questionAreaLabel(q){
  if(isEducationQuestion(q))return q.educationArea||"Eğitim Bilimleri";
  return state.data?.sections?.find(section=>section.questions.some(item=>item.id===q.id))?.title||"Müzik";
}
function mistakeHistory(){return store.get("mistakeHistory",[]).filter(x=>x&&x.questionId)}
function recordAttempt(q,selected,ok,context={}){
  const attempt={
    questionId:q.id||questionStateKey(q),question:q.question,choices:q.choices,answer:q.answer,
    selected:selected||"",ok:Boolean(ok),subject:isEducationQuestion(q)?"education":"music",
    area:questionAreaLabel(q),examTitle:context.examTitle||state.examTitle||"Çalışma",
    durationSeconds:Math.max(1,Math.round((context.durationMs||0)/1000)),
    eliminatedCount:context.eliminatedCount||0,date:new Date().toISOString()
  };
  const attempts=store.get("answerHistory",[]);attempts.unshift(attempt);store.set("answerHistory",attempts.slice(0,2500));
  if(!ok&&selected){
    const mistakes=mistakeHistory(),same=mistakes.find(x=>x.questionId===attempt.questionId&&x.selected===selected);
    if(same){same.count=(same.count||1)+1;same.lastDate=attempt.date;same.durationSeconds=attempt.durationSeconds;same.examTitle=attempt.examTitle}
    else mistakes.unshift({...attempt,count:1,lastDate:attempt.date});
    store.set("mistakeHistory",mistakes.slice(0,1500));
  }
  return attempt;
}
function answer(key){
  if(state.answered)return;state.answered=true;const q=state.exam[state.index],ok=key===q.answer;
  const durationMs=Date.now()-state.questionStartedAt,eliminatedCount=eliminatedChoiceSet(q).size;
  recordEducationAnswer(q,ok);
  if(ok){state.correct++;removeWrongQuestion(q)}
  else{state.wrong++;saveWrongQuestion(q)}
  const attempt=recordAttempt(q,key,ok,{durationMs,eliminatedCount});
  state.examResults.push({q,selected:key,ok,durationSeconds:attempt.durationSeconds,eliminatedCount});
  document.querySelectorAll(".original-choice").forEach(b=>{b.disabled=true;if(b.dataset.key===q.answer)b.classList.add("correct");else if(b.dataset.key===key)b.classList.add("wrong")});
  if($("#elimination-toggle"))$("#elimination-toggle").disabled=true;
  $("#feedback").innerHTML=`<div class="result"><b>${ok?"Doğru!":"Yanlış."}</b>${!ok?`<br>Doğru cevap: ${q.answer}) ${esc(q.choices[q.answer])}`:""}</div>${!ok?distractorLabHtml(q,key):""}`;
  if(!ok)mountDistractorLab(q,key);
  $("#next").classList.remove("hidden");
}
const EDUCATION_AREAS=[
  "Gelişim Psikolojisi","Öğrenme Psikolojisi","Program Geliştirme",
  "Öğretim İlke ve Yöntemleri","Ölçme ve Değerlendirme","Rehberlik","Sınıf Yönetimi"
];
const EDUCATION_THEORISTS=[
  ["Piaget","Bilişsel gelişim","Şema, özümseme, uyumsama, dengeleme ve gelişim dönemleri."],
  ["Vygotsky","Sosyokültürel kuram","Yakınsal gelişim alanı, dil ve yetişkin/akran desteği."],
  ["Erikson","Psikososyal gelişim","Yaşam boyu sekiz dönem ve her döneme özgü çatışma."],
  ["Kohlberg","Ahlak gelişimi","Gelenek öncesi, geleneksel ve gelenek sonrası düzeyler."],
  ["Skinner","Edimsel koşullanma","Pekiştirme, ceza, sönme ve pekiştirme tarifeleri."],
  ["Pavlov","Klasik koşullanma","Koşulsuz ve koşullu uyarıcı/tepki bağları."],
  ["Bandura","Sosyal öğrenme","Model alma, gözlem, dolaylı pekiştirme ve öz yeterlik."],
  ["Bruner","Buluş yoluyla öğrenme","Eylemsel, imgesel, sembolik temsil ve sarmal program."],
  ["Ausubel","Anlamlı öğrenme","Ön organize ediciler ve yeni bilginin mevcut yapıyla bağlanması."],
  ["Bloom","Tam öğrenme ve taksonomi","Bilişsel hedef basamakları, dönüt-düzeltme ve öğrenme ürünleri."],
  ["Gagné","Öğrenme koşulları","Öğrenme ürünleri ve dokuz aşamalı öğretim etkinlikleri."],
  ["Maslow","İhtiyaçlar hiyerarşisi","Fizyolojik ihtiyaçlardan kendini gerçekleştirmeye uzanan yapı."]
];
const EDUCATION_COMPARISONS=[
  ["Olumsuz pekiştirme","Ceza","Olumsuz pekiştirme davranışı artırır; ceza davranışı azaltmayı amaçlar."],
  ["Geçerlik","Güvenirlik","Geçerlik amaca uygun ölçme; güvenirlik sonuçların tutarlılığıdır."],
  ["Özümseme","Uyumsama","Özümsemede bilgi mevcut şemaya alınır; uyumsamada şema değiştirilir."],
  ["Rehberlik","Psikolojik danışma","Rehberlik kapsamlı hizmetler bütünü; danışma uzmanla yürütülen profesyonel ilişkidir."],
  ["Dönüt","Düzeltme","Dönüt öğrenme durumu bilgisidir; düzeltme eksikliği giderecek işlemdir."],
  ["Klasik koşullanma","Edimsel koşullanma","Klasikte uyarıcılar; edimselde davranışın sonuçları temel alınır."],
  ["Biçimlendirici değerlendirme","Düzey belirleyici değerlendirme","İlki süreçte geliştirme, ikincisi süreç sonunda karar verme amaçlıdır."],
  ["Buluş yoluyla öğretim","Sunuş yoluyla öğretim","Buluşta örnekten ilkeye; sunuşta genelden özele ilerlenir."],
  ["İçsel güdülenme","Dışsal güdülenme","İçsel güdü etkinliğin kendisinden; dışsal güdü ödül veya sonuçtan doğar."],
  ["Ölçüt bağımlı değerlendirme","Norm bağımlı değerlendirme","İlki önceden belirlenen ölçüte; ikincisi grubun başarısına göre karar verir."]
];
function recordEducationAnswer(q,ok){
  if(!q?.educationArea)return;
  const stats=store.get("educationStats",{}),x=stats[q.educationArea]||{correct:0,wrong:0,total:0};
  x.total++;ok?x.correct++:x.wrong++;stats[q.educationArea]=x;store.set("educationStats",stats);
}
function educationAreaStats(area){
  const x=store.get("educationStats",{})[area]||{correct:0,wrong:0,total:0};
  return {...x,score:x.total?Math.round(x.correct/x.total*100):null};
}
function finishExam(){
  if(state.activeSavedTestId){store.set("savedTests",savedTests().filter(x=>x.id!==state.activeSavedTestId));state.activeSavedTestId=null}
  const score=Math.round(state.correct/state.exam.length*100),h=store.get("history",[]);
  h.unshift({date:new Date().toISOString(),title:state.examTitle,total:state.exam.length,correct:state.correct,wrong:state.wrong,score});store.set("history",h.slice(0,100));
  setTitle("Sınav Sonu Otopsisi",state.examTitle,true);app.innerHTML=`<section class="hero center autopsy-hero"><h2>%${score}</h2><p>${state.correct} doğru · ${state.wrong} yanlış</p></section>
  ${examAutopsyHtml(state.examResults,state.examTitle)}
  <div class="actions center"><button class="primary" id="again">Tekrar Çöz</button><button class="secondary" id="home">Ana Sayfa</button></div>`;
  mountExamAutopsy(state.examResults,state.examTitle);
  $("#again").onclick=()=>startExam(shuffle(state.exam),state.examTitle);$("#home").onclick=()=>nav("home");
}
function renderSimulationSetup(){
  setTitle("Gerçek Sınav Simülasyonu","Süreli ve geri bildirimsiz",true);
  const max=allQuestions().length;
  app.innerHTML=`<section class="hero simulation-hero"><h2>Gerçek sınav düzeni</h2><p>Sınav sırasında doğru cevap gösterilmez. Soruları boş bırakabilir, işaretleyebilir ve daha sonra geri dönebilirsin.</p></section>
  <div class="ai-control-grid"><div><label>Soru sayısı</label><select id="sim-count">${[50,70,100].filter(x=>x<=max).map(x=>`<option ${x===70?"selected":""}>${x}</option>`).join("")}</select></div><div><label>Süre</label><select id="sim-minutes"><option>60</option><option selected>90</option><option>120</option></select></div></div>
  <label class="check-row"><input id="sim-confirm" type="checkbox"><span>Sınavı başlattığımda sürenin hemen başlayacağını biliyorum.</span></label>
  <div class="actions"><button class="primary" id="start-simulation">Sınavı Başlat</button></div>`;
  $("#start-simulation").onclick=()=>{if(!$("#sim-confirm").checked)return toast("Başlamadan önce onay kutusunu işaretle.");startSimulation(+$("#sim-count").value,+$("#sim-minutes").value)};
}
function startSimulation(count,minutes){
  startSimulationWithQuestions(shuffle(allQuestions()).slice(0,count),minutes,"Gerçek Sınav");
}
function simulationTime(){
  const left=Math.max(0,Math.ceil((state.simulation.endsAt-Date.now())/1000));
  return `${String(Math.floor(left/60)).padStart(2,"0")}:${String(left%60).padStart(2,"0")}`;
}
function updateSimulationClock(){const el=$("#sim-clock");if(el)el.textContent=simulationTime()}
function renderSimulationQuestion(){
  cancelVoiceEngine();
  const s=state.simulation,q=s.questions[s.index],selected=s.answers[q.id],marked=s.marked.includes(q.id),eliminated=eliminatedChoiceSet(q);
  if(s.activeQuestionId!==q.id){s.activeQuestionId=q.id;s.questionEnteredAt=Date.now()}
  setTitle(s.title||"Gerçek Sınav",`Soru ${s.index+1} / ${s.questions.length}`,true);
  app.innerHTML=`<div class="simulation-bar"><b id="sim-clock">${simulationTime()}</b><span>${Object.keys(s.answers).length} cevaplandı · ${s.questions.length-Object.keys(s.answers).length} boş</span><button class="secondary save-test-button" id="save-simulation">💾 Testi Kaydet</button></div>
  <div class="progress"><i style="width:${Math.round((s.index+1)/s.questions.length*100)}%"></i></div><div class="question">${esc(q.question)}</div>
  ${questionSourcesHtml(q)}
  ${questionVoiceButtonHtml()}
  ${choiceEliminationHtml()}
  <div>${Object.entries(q.choices).map(([k,v])=>`<button class="choice original-choice ${selected===k?"selected":""} ${eliminated.has(k)?"eliminated":""}" data-key="${k}"><strong>${k}</strong><span>${esc(v)}</span></button>`).join("")}</div>
  ${topicLessonHtml()}
  ${aiQuestionSolutionHtml()}
  ${similarQuestionHtml()}
  <label class="hard-toggle simulation-mark"><input id="sim-mark" type="checkbox" ${marked?"checked":""}> ★ Bu soruya dön</label>
  <div class="question-map">${s.questions.map((x,i)=>`<button data-index="${i}" class="${i===s.index?"current":""} ${s.answers[x.id]?"answered":""} ${s.marked.includes(x.id)?"marked":""}">${i+1}</button>`).join("")}</div>
  <div class="actions simulation-actions"><button class="secondary" id="sim-prev" ${s.index===0?"disabled":""}>Önceki</button><button class="secondary" id="sim-clear">Cevabı Sil</button><button class="primary" id="sim-next">${s.index===s.questions.length-1?"Sınavı Bitir":"Sonraki"}</button></div>`;
  mountTopicLesson(q,{simulation:true});
  mountAiQuestionSolution(q,{simulation:true,selectedAnswer:()=>s.answers[q.id]||""});
  mountSimilarQuestion(q);
  mountQuestionVoice(q);
  mountChoiceElimination(q,key=>{s.answers[q.id]=key;renderSimulationQuestion()});
  $("#save-simulation").onclick=saveCurrentSimulation;
  $("#sim-mark").onchange=e=>{s.marked=e.target.checked?[...new Set([...s.marked,q.id])]:s.marked.filter(x=>x!==q.id);renderSimulationQuestion()};
  document.querySelectorAll(".question-map button").forEach(b=>b.onclick=()=>{commitSimulationQuestionTime();s.index=+b.dataset.index;renderSimulationQuestion()});
  $("#sim-prev").onclick=()=>{commitSimulationQuestionTime();s.index--;renderSimulationQuestion()};
  $("#sim-clear").onclick=()=>{delete s.answers[q.id];renderSimulationQuestion()};
  $("#sim-next").onclick=()=>{commitSimulationQuestionTime();if(s.index<s.questions.length-1){s.index++;renderSimulationQuestion()}else confirmFinishSimulation()};
}
function commitSimulationQuestionTime(){
  const s=state.simulation;if(!s?.activeQuestionId||!s.questionEnteredAt)return;
  s.timeSpent[s.activeQuestionId]=(s.timeSpent[s.activeQuestionId]||0)+(Date.now()-s.questionEnteredAt);
  s.questionEnteredAt=Date.now();
}
function confirmFinishSimulation(){
  const s=state.simulation,blank=s.questions.length-Object.keys(s.answers).length;
  if(confirm(`${blank} boş soru var. Sınavı bitirmek istiyor musun?`))finishSimulation(false);
}
function finishSimulation(auto){
  const s=state.simulation;if(!s)return;clearInterval(state.simulationTimer);state.simulationTimer=null;
  if(state.activeSavedTestId){store.set("savedTests",savedTests().filter(x=>x.id!==state.activeSavedTestId));state.activeSavedTestId=null}
  commitSimulationQuestionTime();
  const results=s.questions.map(q=>({q,selected:s.answers[q.id]||null,ok:s.answers[q.id]===q.answer}));
  results.filter(x=>x.selected).forEach(x=>{
    recordEducationAnswer(x.q,x.ok);
    const attempt=recordAttempt(x.q,x.selected,x.ok,{examTitle:s.title,durationMs:s.timeSpent[x.q.id]||0,eliminatedCount:eliminatedChoiceSet(x.q).size});
    x.durationSeconds=attempt.durationSeconds;x.eliminatedCount=attempt.eliminatedCount;
  });
  const correct=results.filter(x=>x.ok).length,blank=results.filter(x=>!x.selected).length,wrong=results.length-correct-blank,score=Math.round(correct/results.length*100);
  const history=store.get("history",[]);history.unshift({date:new Date().toISOString(),title:s.title==="Özel Deneme"?"Özel Deneme · Sınav Modu":"Gerçek Sınav Simülasyonu",total:results.length,correct,wrong,blank,score});store.set("history",history.slice(0,100));
  results.filter(x=>x.selected).forEach(x=>x.ok?removeWrongQuestion(x.q):saveWrongQuestion(x.q));
  state.simulation=null;setTitle("Sınav Sonu Otopsisi",auto?"Süre doldu":"Sınav tamamlandı",true);
  app.innerHTML=`<section class="hero center simulation-hero autopsy-hero"><h2>%${score}</h2><p>${correct} doğru · ${wrong} yanlış · ${blank} boş</p></section>
  ${examAutopsyHtml(results,s.title)}
  <div class="list">${results.filter(x=>!x.ok).map((x,i)=>`<article class="list-item"><h3>${i+1}. ${esc(x.q.question)}</h3><p class="muted">Senin cevabın: ${x.selected?`${x.selected}) ${esc(x.q.choices[x.selected])}`:"Boş"}<br>Doğru cevap: <b>${x.q.answer}) ${esc(x.q.choices[x.q.answer])}</b></p>${x.q.explanation?`<p>${esc(x.q.explanation)}</p>`:""}${x.selected?`<button class="secondary result-distractor-button" data-result-lab="${i}">🧪 Bu Çeldiriciyi İncele</button><div class="distractor-lab-box hidden" data-result-lab-box="${i}"><div></div></div>`:""}</article>`).join("")||'<div class="result">Tüm sorular doğru!</div>'}</div>
  <div class="actions center"><button class="primary" id="sim-again">Yeni Simülasyon</button><button class="secondary" id="sim-home">Ana Sayfa</button></div>`;
  mountExamAutopsy(results,s.title);
  mountResultDistractorLabs(results.filter(x=>!x.ok));
  $("#sim-again").onclick=renderSimulationSetup;$("#sim-home").onclick=()=>nav("home");
}
function renderWrong(){
  const music=savedWrongQuestions("wrongMusicQuestions"),education=savedWrongQuestions("wrongEducationQuestions");
  setTitle("Yanlış Sorular","Alanına göre ayrı tekrar");
  app.innerHTML=`<section class="hero"><h2>Yanlışlarını tekrar çöz</h2><p>Müzik Alanı ve Eğitim Bilimleri yanlışları birbirine karışmadan ayrı tutulur.</p></section>
  <div class="grid">
    <button class="card wrong-category" data-key="wrongMusicQuestions"><b>🎼 Müzik Alanı Yanlışları</b><span class="pill">${music.length} soru</span></button>
    <button class="card wrong-category" data-key="wrongEducationQuestions"><b>🎓 Eğitim Bilimleri Yanlışları</b><span class="pill">${education.length} soru</span></button>
    <button class="card music-report-feature" id="music-wrong-analysis"><b>🧬 AI Müzik Yanlışları</b><span>Yanlışlarını incelet, kişisel özet ve PDF hazırla</span></button>
    <button class="card workbook-feature" id="personal-workbook"><b>📕 Kişisel Çalışma Kitabı</b><span>Yanlışlarından yazdırılabilir çalışma föyü üret</span></button>
    <button class="card voice-lesson-feature" id="wrong-voice-lesson"><b>🎧 Yanlışlardan Sesli Ders</b><span>Dinle, durdur ve kalemle not al</span></button>
  </div>`;
  document.querySelectorAll(".wrong-category").forEach(b=>b.onclick=()=>renderWrongCategory(b.dataset.key));
  $("#music-wrong-analysis").onclick=renderMusicWrongAnalysis;
  $("#personal-workbook").onclick=renderPersonalWorkbook;
  $("#wrong-voice-lesson").onclick=renderWrongVoiceLesson;
}
function renderWrongCategory(key){
  const education=key==="wrongEducationQuestions";
  renderSavedWrongQuestions(
    education?"Eğitim Bilimleri Yanlışları":"Müzik Alanı Yanlışları",
    key,
    education?"Eğitim Yanlışlarını Çöz":"Müzik Yanlışlarını Çöz",
    education?"AI ve çevrimdışı Eğitim Bilimleri yanlışların burada birikir.":"Batı Müziği Tarihi dâhil bütün müzik alanı yanlışların burada birikir."
  );
}
function renderSavedWrongQuestions(title,key,button,empty){
  setTitle(title,"Tekrar çalışma",true);const qs=savedWrongQuestions(key);
  app.innerHTML=qs.length?`<section class="hero"><h2>${qs.length} soru</h2><p>Hazır olduğunda yeniden çöz.</p><div class="actions"><button class="primary" id="solve">${button}</button><button class="danger" id="clear">Listeyi Temizle</button></div></section><div class="list">${qs.map(q=>`<article class="list-item"><h3>${esc(q.question)}</h3><div class="muted">${esc(q.choices[q.answer])}</div></article>`).join("")}</div>`:`<section class="hero"><h2>Liste boş</h2><p>${empty}</p></section>`;
  if(qs.length){$("#solve").onclick=()=>startExam(shuffle(qs),title);$("#clear").onclick=()=>{if(confirm("Bu liste temizlensin mi?")){store.set(key,[]);renderWrongCategory(key)}}}
}
function renderHard(){
  const qs=savedHardQuestions(),savedCount=Math.min(qs.length,Math.max(1,+store.get("hardExamCount",Math.min(10,qs.length))||1));
  setTitle("Zor Sorular",qs.length?`${qs.length} kayıtlı soru · test oluşturucu`:"Tekrar çalışma",true);
  app.innerHTML=qs.length?`<section class="hero"><h2>${qs.length} zor soru kayıtlı</h2><p>Sabit bankadan veya AI tarafından üretilen soruların tamamı burada kalıcı tutulur. İçlerinden istediğin sayıda rastgele test oluşturabilirsin.</p>
  <label>Testte kaç soru olsun? (1–${qs.length})</label><input id="hard-exam-count" type="number" min="1" max="${qs.length}" step="1" value="${savedCount}">
  <div class="actions"><button class="primary" id="hard-build">Zor Sorulardan Test Oluştur</button><button class="secondary" id="hard-all">Tümünü Çöz</button><button class="danger" id="hard-clear">Listeyi Temizle</button></div><div id="hard-status"></div></section>
  <div class="list">${qs.map(q=>`<article class="list-item"><h3>${esc(q.question)}</h3><div class="muted">${esc(q.choices[q.answer])}</div></article>`).join("")}</div>`:`<section class="hero"><h2>Liste boş</h2><p>Bir soruyu çözerken “★ Zor” kutusunu işaretlediğinde soru, AI üretimi olsa bile burada kalıcı olarak görünür.</p></section>`;
  if(!qs.length)return;
  $("#hard-build").onclick=()=>{
    const count=Math.round(+$("#hard-exam-count").value),status=$("#hard-status");
    if(!Number.isFinite(count)||count<1||count>qs.length)return status.innerHTML=`<div class="result">Soru sayısını 1 ile ${qs.length} arasında yaz.</div>`;
    store.set("hardExamCount",count);startExam(shuffle(qs).slice(0,count),`Zor Sorular Testi · ${count} Soru`);
  };
  $("#hard-all").onclick=()=>startExam(shuffle(qs),`Zor Sorular Testi · ${qs.length} Soru`);
  $("#hard-clear").onclick=()=>{if(confirm("Zor Sorular listesinin tamamı temizlensin mi?")){store.set("hardQuestions",[]);store.set("hardQuestionItems",[]);renderHard()}};
}
function renderStats(){
  setTitle("Başarı Analizi","Son denemelerin");const h=store.get("history",[]);
  app.innerHTML=h.length?`<div class="list">${h.map(x=>`<article class="list-item"><h3>${esc(x.title)} · %${x.score}</h3><p class="muted">${new Date(x.date).toLocaleString("tr-TR")} · ${x.correct} doğru / ${x.wrong} yanlış</p><div class="bar"><span style="width:${x.score}%"></span></div></article>`).join("")}</div>`:`<section class="hero"><h2>Henüz sonuç yok</h2><p>Bir deneme tamamladığında sonuçların burada görünecek.</p></section>`;
}
function renderMore(){
  setTitle("Çalışma Alanları","Tüm araçlar");app.innerHTML=`<div class="grid">
  <button class="card" data-go="hard"><b>★ Zor Sorular</b></button><button class="card" data-go="cards"><b>🗂 Ezber Kartları</b></button>
  <button class="card memory-feature" data-go="memory"><b>🧠 Yoğun Ezber Soruları</b></button>
  <button class="card simulation-feature" data-go="simulation"><b>⏱ Gerçek Sınav Simülasyonu</b></button>
  <button class="card opera-ballet-feature" data-go="opera-ballet"><b>🎭 AI Opera ve Bale</b></button>
  <button class="card music-ai-feature" data-go="music-ai"><b>🎼 AI Müzik Soru Oluşturucu</b></button>
  <button class="card khk-2025-feature" data-go="real-music-2026"><b>🏆 2026 Gerçek Müzik Sınavı Tarzı</b></button>
  <button class="card ags-workbook-feature" data-go="ags-workbook"><b>📗 AGS Eğitim Bilimleri Kitabı</b></button>
  <button class="card saved-sentences-feature" data-go="saved-sentences"><b>📌 Kaydettiğim Cümleler</b></button>
  <button class="card offline-education-feature" data-go="offline-education"><b>📘 Eğitim Bilimleri</b></button>
  <button class="card education-feature" data-go="education"><b>🎓 AI Eğitim Bilimleri Merkezi</b></button>
  <button class="card music-report-feature" data-go="music-wrong-ai"><b>🧬 AI Müzik Yanlışları</b></button>
  <button class="card workbook-feature" data-go="workbook"><b>📕 Kişisel Çalışma Kitabı</b></button>
  <button class="card voice-lesson-feature" data-go="wrong-voice-lesson"><b>🎧 Yanlışlardan Sesli Ders</b></button>
  <button class="card forgetting-feature" data-go="forgetting-risk"><b>⏳ Unutma Riski Sistemi</b></button>
  <button class="card saved-tests-feature" data-go="saved-tests"><b>💾 Kayıtlı Testler</b></button>
  <button class="card custom-exam-feature" data-go="custom-exam"><b>🧩 Özel Deneme Oluştur</b></button>
  <button class="card" data-go="ai-center"><b>✨ AI Çalışma Merkezi</b></button><button class="card" data-go="study"><b>📚 Konu Çalışma</b></button>
  <button class="card" data-go="profile"><b>👤 Kişisel Bilgiler</b></button><button class="card" data-go="settings"><b>⚙ Ayarlar</b></button></div>`;
  app.onclick=e=>{const b=e.target.closest("[data-go]");if(b)({hard:renderHard,cards:renderFlashcards,memory:renderMemoryCenter,simulation:renderSimulationSetup,"opera-ballet":renderOperaBallet,"music-ai":renderMusicQuestionGenerator,"khk-music-2025":renderKhkMusic2025Generator,"real-music-2026":renderRealMusic2026Generator,"ags-workbook":()=>EBWorkbook.render(),"saved-sentences":renderSavedSentences,"offline-education":renderOfflineEducation,education:renderEducationCenter,"music-wrong-ai":renderMusicWrongAnalysis,workbook:renderPersonalWorkbook,"wrong-voice-lesson":renderWrongVoiceLesson,"forgetting-risk":renderForgettingRisk,"saved-tests":renderSavedTests,"custom-exam":renderCustomExamBuilder,"ai-center":renderAiStudyCenter,study:renderStudy,profile:renderProfile,settings:renderSettings}[b.dataset.go])()};
}
function renderFlashcards(){
  setTitle("Ezber Kartları","Dokun ve cevabı gör",true);const sections=state.data.sections;
  app.innerHTML=`<section class="hero"><label>Konu</label><select id="card-section"><option value="all">Tüm konular</option>${sections.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join("")}</select><div class="actions"><button class="primary" id="start-cards">Kartları Başlat</button></div></section>`;
  $("#start-cards").onclick=()=>{const v=$("#card-section").value,qs=v==="all"?allQuestions():sections.find(s=>s.id===v).questions;showCard(shuffle(qs),0,false)};
}
function showCard(qs,i,reveal){
  const q=qs[i];setTitle("Ezber Kartları",`Kart ${i+1} / ${qs.length}`,true);
  app.innerHTML=`<div class="flashcard ${reveal?"flipped":""}" id="flash"><div><small>${reveal?"CEVAP":"SORU"}</small><h2>${reveal?`${q.answer}) ${esc(q.choices[q.answer])}`:esc(q.question)}</h2>${reveal&&q.explanation?`<p>${esc(q.explanation)}</p>`:""}<span>Çevirmek için dokun</span></div></div>${topicLessonHtml()}${aiQuestionSolutionHtml()}${similarQuestionHtml()}<div class="actions center"><button class="secondary" id="prev" ${i===0?"disabled":""}>Önceki</button><button class="primary" id="next-card">${i===qs.length-1?"Başa Dön":"Sonraki"}</button></div>`;
  mountTopicLesson(q,{warnBeforeReveal:()=>!reveal});
  mountAiQuestionSolution(q,{warnBeforeReveal:()=>!reveal});
  mountSimilarQuestion(q);
  $("#flash").onclick=()=>showCard(qs,i,!reveal);$("#prev").onclick=()=>showCard(qs,i-1,false);$("#next-card").onclick=()=>showCard(qs,i===qs.length-1?0:i+1,false);
}
const MEMORY_LABELS={
  composer:"Eser – Besteci",
  period:"Dönem – Akım",
  person:"Kişi – Katkı",
  term:"Terim – Tanım",
  instrument:"Çalgı – Teknik",
  other:"Diğer Yoğun Ezber"
};
function localMemoryCategory(q){
  const text=`${q.question||""} ${q.choices?.[q.answer]||""}`.toLocaleLowerCase("tr-TR");
  if(/besteci|besteledi|operası|senfoni|konçerto|oratoryo|eseri kime|kime aittir/.test(text))return "composer";
  if(/dönem|yüzyıl|akım|rönesans|barok|klasik|romantik|çağ|tarihinde|yılında/.test(text))return "period";
  if(/kimdir|tarafından|geliştiren|kurucusu|öncüsü|müzikolog|sanatçı/.test(text))return "person";
  if(/terim|ne ad verilir|anlamı|tanımı|ifade eder|hangi dil|usul|makam|form/.test(text))return "term";
  if(/çalgı|enstrüman|tel|akort|yay|nefesli|vurmalı|çalma tekniği/.test(text))return "instrument";
  return null;
}
function memoryMap(){
  const saved=store.get("aiMemoryMap",null);
  if(saved&&saved.version===1&&saved.items)return saved.items;
  const items={};allQuestions().forEach(q=>{const category=localMemoryCategory(q);if(category)items[q.id]=category});
  return items;
}
function memoryQuestions(category="all"){
  const map=memoryMap();
  return allQuestions().filter(q=>map[q.id]&&(category==="all"||map[q.id]===category));
}
function renderMemoryCenter(){
  const map=memoryMap(),qs=memoryQuestions(),counts={};
  Object.values(map).forEach(x=>counts[x]=(counts[x]||0)+1);
  setTitle("Yoğun Ezber Soruları",`${qs.length} soru`,true);
  app.innerHTML=`<section class="hero memory-hero"><h2>Ağır ezberleri ayrı çalış</h2><p>Eser–besteci, dönem, kişi, terim ve çalgı bilgileri soru bankasından ayrılır. “AI ile Tara” bütün bankayı daha ayrıntılı sınıflandırır.</p>
  <div class="memory-counts">${Object.entries(MEMORY_LABELS).filter(([k])=>counts[k]).map(([k,v])=>`<span>${v}: ${counts[k]}</span>`).join("")}</div></section>
  <label>Kategori</label><select id="memory-category"><option value="all">Tüm yoğun ezberler (${qs.length})</option>${Object.entries(MEMORY_LABELS).map(([k,v])=>`<option value="${k}">${v} (${counts[k]||0})</option>`).join("")}</select>
  <div class="actions"><button class="primary" id="solve-memory">Soruları Çöz</button><button class="secondary" id="cards-memory">Ezber Kartları</button><button class="secondary" id="scan-memory">AI ile Tara</button></div>
  <div id="memory-status" class="result">${store.get("aiMemoryMap",null)?"Son AI taraması cihazda kayıtlı.":"Hızlı yerel tarama hazır; istersen AI ile ayrıntılı tarayabilirsin."}</div>`;
  const selected=()=>memoryQuestions($("#memory-category").value);
  $("#solve-memory").onclick=()=>startExam(shuffle(selected()),"Yoğun Ezber Soruları");
  $("#cards-memory").onclick=()=>{const list=shuffle(selected());if(list.length)showCard(list,0,false);else toast("Bu kategoride soru yok.")};
  $("#scan-memory").onclick=scanMemoryWithAI;
}
async function scanMemoryWithAI(){
  if(!store.get("apiKey",""))return toast("Önce Ayarlar bölümüne API anahtarını gir.");
  const button=$("#scan-memory"),status=$("#memory-status"),questions=allQuestions(),items={};
  button.disabled=true;
  try{
    for(let start=0;start<questions.length;start+=50){
      const batch=questions.slice(start,start+50);
      status.textContent=`AI tarıyor: ${Math.min(start+batch.length,questions.length)} / ${questions.length}`;
      const compact=batch.map(q=>({id:q.id,soru:q.question,cevap:q.choices?.[q.answer]||""}));
      const prompt=`Aşağıdaki sınav sorularını sınıflandır. Yalnızca doğrudan ezber gerektiren olgusal soruları seç: eser-besteci, dönem-akım-tarih, kişi-katkı, terim-tanım, çalgı-teknik veya diğer yoğun ezber. Kavramsal yorum ve hesap sorularını seçme. Yalnızca JSON döndür: {"items":[{"id":"...","category":"composer|period|person|term|instrument|other"}]}\n${JSON.stringify(compact)}`;
      const raw=await openAIText(prompt,"Sen titiz bir müzik öğretmenliği sınavı soru sınıflandırıcısısın. Yalnızca geçerli JSON ver.");
      const parsed=JSON.parse(raw.replace(/^```json\s*|```$/g,"").trim());
      (parsed.items||[]).forEach(x=>{if(MEMORY_LABELS[x.category])items[x.id]=x.category});
    }
    store.set("aiMemoryMap",{version:1,scannedAt:new Date().toISOString(),items});
    toast(`${Object.keys(items).length} yoğun ezber sorusu ayrıldı`);
    renderMemoryCenter();
  }catch(e){
    status.textContent=`Tarama durdu: ${e.message}`;
    button.disabled=false;
  }
}
function renderProfile(){
  const p=store.get("profile",{name:"Çağlar",examDate:"",goal:"KKTC Müzik Öğretmenliği sınavını kazanmak",daily:"30"});
  setTitle("Kişisel Bilgi Köşesi","Hedeflerin",true);
  app.innerHTML=`<label>Adın</label><input id="p-name" type="text" value="${esc(p.name)}"><label>Sınav tarihi</label><input id="p-date" type="date" value="${esc(p.examDate)}"><label>Ana hedefin</label><textarea id="p-goal">${esc(p.goal)}</textarea><label>Günlük soru hedefi</label><input id="p-daily" type="number" value="${esc(p.daily)}"><div id="countdown"></div><div class="actions"><button class="primary" id="save-profile">Kaydet</button></div>`;
  if(p.examDate){const d=Math.ceil((new Date(p.examDate+"T23:59:59")-new Date())/86400000);$("#countdown").innerHTML=`<div class="result">${d>=0?`Sınava ${d} gün kaldı.`:"Sınav tarihi geçti."}</div>`}
  $("#save-profile").onclick=()=>{store.set("profile",{name:$("#p-name").value.trim(),examDate:$("#p-date").value,goal:$("#p-goal").value.trim(),daily:$("#p-daily").value});toast("Kişisel bilgiler kaydedildi");renderProfile()};
}
function renderStudy(){
  const notes=store.get("studyNotes",[]);setTitle("Konu Çalışma Köşesi","Plan ve notlar",true);
  app.innerHTML=`<section class="hero"><h2>Yeni çalışma notu</h2><label>Konu</label><input id="note-title" type="text" placeholder="Örn. Öğrenme psikolojisi"><label>Not / yapılacak</label><textarea id="note-text" placeholder="Çalışacağın başlıkları veya kısa notlarını yaz"></textarea><div class="actions"><button class="primary" id="add-note">Ekle</button></div></section><div class="list note-list">${notes.map((n,i)=>`<article class="list-item"><label class="check-row"><input type="checkbox" data-check="${i}" ${n.done?"checked":""}><span><b>${esc(n.title)}</b><br><span class="muted">${esc(n.text)}</span></span></label><button class="text-danger" data-del="${i}">Sil</button></article>`).join("")}</div>`;
  $("#add-note").onclick=()=>{const title=$("#note-title").value.trim(),text=$("#note-text").value.trim();if(!title)return toast("Konu başlığı yaz.");notes.unshift({title,text,done:false});store.set("studyNotes",notes);renderStudy()};
  document.querySelectorAll("[data-check]").forEach(x=>x.onchange=()=>{notes[+x.dataset.check].done=x.checked;store.set("studyNotes",notes)});
  document.querySelectorAll("[data-del]").forEach(x=>x.onclick=()=>{notes.splice(+x.dataset.del,1);store.set("studyNotes",notes);renderStudy()});
}
function renderEducationCenter(){
  const stats=EDUCATION_AREAS.map(area=>({area,...educationAreaStats(area)}));
  setTitle("AI Eğitim Bilimleri Merkezi","7 alanlık kişisel çalışma merkezi",true);
  app.innerHTML=`<section class="hero education-hero"><h2>AI Eğitim Bilimleri</h2><p>Felsefe ve sosyoloji hariç yedi ana alanda çalış. AI, farklı sınav sitelerinden soru biçimi çeşitliliğini inceler; bilgiyi MEB, YÖK, üniversiteler ve Türkçe akademik kaynaklarla doğrular. Her soruda kaynak görünür.</p></section>
  <div class="education-dashboard">${stats.map(x=>`<button class="education-stat" data-area="${esc(x.area)}"><span>${esc(x.area)}</span><b>${x.score===null?"Yeni":`%${x.score}`}</b><small>${x.total?`${x.total} soru`:"Henüz çözülmedi"}</small><i><em style="width:${x.score||0}%"></em></i></button>`).join("")}</div>
  <div class="feature-grid education-tools">
    <button class="card feature" data-tool="lesson"><b>📖 AI Konu Anlatımı</b><span>Özet, sınavlık veya ayrıntılı anlatım</span></button>
    <button class="card feature" data-tool="case"><b>🧩 AI Vaka Soruları</b><span>Öğretmen–öğrenci senaryoları</span></button>
    <button class="card feature" data-tool="theorists"><b>🧠 Kuramcılar ve Kuramlar</b><span>12 temel kuramcı için kart ve test</span></button>
    <button class="card feature" data-tool="compare"><b>⚖ Kavram Karşılaştırma</b><span>En çok karıştırılan kavram çiftleri</span></button>
    <button class="card feature" data-tool="exam"><b>📝 7 Alanlık Deneme</b><span>Alanlardan eşit dağılımlı AI sınavı</span></button>
    <button class="card feature" data-tool="weak"><b>🎯 Zayıf Alan Çalışması</b><span>En düşük başarı alanından özel test</span></button>
  </div>`;
  document.querySelectorAll("[data-area]").forEach(b=>b.onclick=()=>renderEducationLesson(b.dataset.area));
  document.querySelectorAll("[data-tool]").forEach(b=>b.onclick=()=>({
    lesson:renderEducationLesson,case:renderEducationCases,theorists:renderEducationTheorists,
    compare:renderEducationComparisons,exam:renderBalancedEducationExam,weak:startWeakEducationStudy
  }[b.dataset.tool])());
}
function educationAreaSelect(id,selected="Gelişim Psikolojisi"){
  return `<select id="${id}">${EDUCATION_AREAS.map(x=>`<option ${x===selected?"selected":""}>${x}</option>`).join("")}</select>`;
}
function renderEducationLesson(selected="Gelişim Psikolojisi"){
  setTitle("AI Konu Anlatımı","Eğitim Bilimleri",true);
  app.innerHTML=`<section class="hero education-hero"><h2>Konu anlatımı</h2><p>Konuyu sınav mantığıyla öğren; kritik ayrımları ve soru tuzaklarını gör.</p></section>
  <label>Alan</label>${educationAreaSelect("edu-lesson-area",selected)}
  <label>Konu veya kavram</label><input id="edu-lesson-topic" type="text" placeholder="Örn. Piaget bilişsel gelişim dönemleri">
  <label>Anlatım düzeyi</label><select id="edu-lesson-level"><option>1 dakikalık özet</option><option selected>Sınavlık anlatım</option><option>Ayrıntılı ders</option></select>
  <div class="actions"><button class="primary" id="edu-teach">Konuyu Anlat</button></div><div id="edu-output"></div>`;
  $("#edu-teach").onclick=async()=>{
    const area=$("#edu-lesson-area").value,topic=$("#edu-lesson-topic").value.trim()||area,level=$("#edu-lesson-level").value,out=$("#edu-output");
    out.innerHTML='<div class="result">Ders hazırlanıyor…</div>';$("#edu-teach").disabled=true;
    try{const text=await openAIText(`${area} alanında "${topic}" konusunu ${level} düzeyinde anlat. Şu sırayı kullan: temel açıklama, sınavda bilinmesi gerekenler, karıştırılan noktalar, hafıza tekniği, 3 kısa kontrol sorusu.`,"Sen yalnızca Eğitim Bilimleri alanında çalışan, kavramları doğru kullanan uzman bir sınav öğretmenisin. Eğitim Felsefesi ve Sosyolojisine girme. Türkçe ve sınav odaklı anlat.");out.innerHTML=`<div class="lesson-output selectable-study-text" data-save-source="${esc(`${area} · ${topic}`)}">${esc(text)}</div><p class="sentence-save-hint">📌 Bir cümleye basılı tutup seç; altta açılan “Cümleyi Kaydet” düğmesiyle Kaydettiğim Cümleler bölümüne ekle.</p>`}
    catch(e){out.innerHTML=`<div class="result">Hata: ${esc(e.message)}</div>`}finally{$("#edu-teach").disabled=false}
  };
}
function renderEducationCases(){
  setTitle("AI Vaka Soruları","Senaryo tabanlı çalışma",true);
  app.innerHTML=`<section class="hero education-hero"><h2>Vaka soruları</h2><p>KPSS düzeyinde, kısa öğretmen ve öğrenci durumları üzerinden temel kavramı bul.</p></section>
  <div class="ai-control-grid"><div><label>Alan</label>${educationAreaSelect("edu-case-area")}</div><div><label>Soru sayısı</label><select id="edu-case-count"><option>5</option><option selected>10</option><option>15</option><option>20</option></select></div></div>
  <label>Zorluk</label><select id="edu-case-level"><option>Kolay</option><option selected>Orta</option><option>Zor</option></select>
  <div class="actions"><button class="primary" id="edu-case-generate">Vaka Testini Oluştur</button></div><div id="edu-case-status"></div>`;
  $("#edu-case-generate").onclick=()=>generateEducationQuestions([{area:$("#edu-case-area").value,count:+$("#edu-case-count").value}],`Vaka · ${$("#edu-case-level").value}`,"AI Vaka Soruları","#edu-case-status","#edu-case-generate");
}
function renderEducationTheorists(){
  setTitle("Kuramcılar ve Kuramlar","Kartlar ve hızlı test",true);
  app.innerHTML=`<section class="hero education-hero"><h2>12 temel kuramcı</h2><p>Kuramcı–kuram–kavram bağını hızlı kartlarla çalış.</p><div class="actions"><button class="primary" id="theorist-cards">Kartları Başlat</button><button class="secondary" id="theorist-test">AI Test Oluştur</button></div></section>
  <div class="theorist-grid">${EDUCATION_THEORISTS.map(x=>`<article class="list-item"><h3>${esc(x[0])} · ${esc(x[1])}</h3><p>${esc(x[2])}</p></article>`).join("")}</div><div id="theorist-status"></div>`;
  $("#theorist-cards").onclick=()=>showTheoristCard(0,false);
  $("#theorist-test").onclick=()=>generateEducationQuestions([{area:"Gelişim ve Öğrenme Kuramcıları",count:15}],"Kuramcı-kavram eşleştirme","Kuramcılar Testi","#theorist-status","#theorist-test");
}
function showTheoristCard(i,reveal){
  const x=EDUCATION_THEORISTS[i];setTitle("Kuramcı Kartları",`${i+1} / ${EDUCATION_THEORISTS.length}`,true);
  app.innerHTML=`<div class="flashcard ${reveal?"flipped":""}" id="flash"><div><small>${reveal?"KURAM VE KAVRAMLAR":"KURAMCI"}</small><h2>${reveal?esc(x[1]):esc(x[0])}</h2>${reveal?`<p>${esc(x[2])}</p>`:""}<span>Çevirmek için dokun</span></div></div>
  <div class="actions center"><button class="secondary" id="prev" ${i===0?"disabled":""}>Önceki</button><button class="primary" id="next-card">${i===EDUCATION_THEORISTS.length-1?"Başa Dön":"Sonraki"}</button></div>`;
  $("#flash").onclick=()=>showTheoristCard(i,!reveal);$("#prev").onclick=()=>showTheoristCard(i-1,false);$("#next-card").onclick=()=>showTheoristCard(i===EDUCATION_THEORISTS.length-1?0:i+1,false);
}
function renderEducationComparisons(){
  setTitle("Kavram Karşılaştırma","Karıştırılan kritik ayrımlar",true);
  app.innerHTML=`<section class="hero education-hero"><h2>Kavram çiftleri</h2><p>Sınavlarda çeldirici olarak kullanılan temel farkları karşılaştır.</p><div class="actions"><button class="primary" id="comparison-test">Bu Farklardan Test Oluştur</button></div></section>
  <div class="comparison-list">${EDUCATION_COMPARISONS.map(x=>`<article class="comparison-card"><div><b>${esc(x[0])}</b><span>↔</span><b>${esc(x[1])}</b></div><p>${esc(x[2])}</p></article>`).join("")}</div><div id="comparison-status"></div>`;
  $("#comparison-test").onclick=()=>generateEducationQuestions([{area:"Karıştırılan Eğitim Bilimleri kavramları",count:15}],"Kavram ayrımı ve kısa vaka","Kavram Karşılaştırma Testi","#comparison-status","#comparison-test");
}
function renderBalancedEducationExam(){
  setTitle("7 Alanlık Deneme","Dengeli Eğitim Bilimleri sınavı",true);
  app.innerHTML=`<section class="hero education-hero"><h2>Dengeli alan dağılımı</h2><p>Yedi ana alanın her birinden eşit sayıda soru üretilir.</p></section>
  <label>Her alandan</label><select id="balanced-count"><option value="1">1 soru · Toplam 7</option><option value="2">2 soru · Toplam 14</option><option value="3" selected>3 soru · Toplam 21</option><option value="5">5 soru · Toplam 35</option></select>
  <div class="actions"><button class="primary" id="balanced-generate">Denemeyi Oluştur</button></div><div id="balanced-status"></div>`;
  $("#balanced-generate").onclick=()=>{const n=+$("#balanced-count").value;generateEducationQuestions(EDUCATION_AREAS.map(area=>({area,count:n})),"Sınav odaklı, dengeli zorluk","7 Alanlık Eğitim Bilimleri Denemesi","#balanced-status","#balanced-generate")};
}
function startWeakEducationStudy(){
  const ranked=EDUCATION_AREAS.map(area=>({area,...educationAreaStats(area)})).filter(x=>x.total).sort((a,b)=>a.score-b.score);
  const area=ranked[0]?.area||"Gelişim Psikolojisi";
  setTitle("Zayıf Alan Çalışması",area,true);
  app.innerHTML=`<section class="hero education-hero"><h2>${esc(area)}</h2><p>${ranked.length?`Başarı oranı %${ranked[0].score}. Bu alan için hedefli test hazırlanacak.`:"Henüz yeterli veri yok. Başlangıç alanı olarak Gelişim Psikolojisi seçildi."}</p><div class="actions"><button class="primary" id="weak-generate">10 Soruluk Test Oluştur</button></div></section><div id="weak-status"></div>`;
  $("#weak-generate").onclick=()=>generateEducationQuestions([{area,count:10}],"Zayıf noktaları ölçen, açıklamalı ve orta-zor","Zayıf Alan · "+area,"#weak-status","#weak-generate");
}
function educationPrompt(groups,focus){
  const distribution=groups.map(x=>`${x.area}: ${x.count} soru`).join(", ");
  const total=groups.reduce((n,x)=>n+x.count,0);
  return `KPSS ve KKTC Kamu Hizmeti Komisyonu Eğitim Bilimleri sınavı düzeyinde toplam ${groups.reduce((n,x)=>n+x.count,0)} özgün, dört seçenekli soru üret. Dağılım: ${distribution}. Felsefe ve Sosyoloji dahil olmasın. Odak: ${focus}.

Önce web taraması yap ve sorulardaki bilgileri güncel, güvenilir Türkçe kaynaklarla doğrula. Kaynak önceliği:
1. MEB'in resmî mevzuat, öğretim programı, kılavuz ve yayınları (meb.gov.tr ve bağlı resmî MEB alan adları),
2. YÖK ve YÖK Ulusal Tez Merkezi (yok.gov.tr, tez.yok.gov.tr),
3. Türkiye'deki üniversitelerin resmî eğitim fakültesi, ders içeriği, açık ders ve akademik yayın sayfaları (.edu.tr),
4. DergiPark ve TR Dizin'deki Türkçe hakemli akademik yayınlar.
Blog, forum, sosyal medya, reklam/özet siteleri ve kaynağı belirsiz soru bankalarını BİLGİ DOĞRULAMA kaynağı olarak kullanma. Mümkünse kritik bilgiyi iki bağımsız güvenilir kaynakla karşılaştır. Kaynaklar çelişirse soru üretme. Güncel mevzuat veya program sorularında mutlaka resmî MEB/YÖK kaynağını esas al. Kaynaklardaki soruları kopyalama; yalnız doğrulanmış bilgiden özgün soru yaz.

SORU BİÇİMİ ARAŞTIRMASI:
- Sinavtime, OnlineSoru, SoruMarket, Sinavcoz, Pegem'in erişilebilen örnek/çıkmış soru sayfaları ve bunlara benzer nitelikli Türkçe sınav sayfalarına yalnız soru türlerinin, kök yapılarının, güçlük düzeylerinin ve konu dağılımının çeşitliliğini görmek için bak.
- Bu sitelerdeki soruları, cümleleri, kişi adlarını veya seçenekleri kopyalama ve onları bilimsel bilgi kaynağı sayma.
- Her yeni soruyu sıfırdan yaz. ÖSYM/KPSS ve uygulamadaki KHK 2025 sorularının ölçme yaklaşımına benzesin ama hiçbir sorunun yakın yeniden yazımı olmasın.

TAM ALAN VE ALT KONU KAPSAMI:
- Yalnız en bilinen kavramlara yığılma. Seçilen alanın bütün temel alt konularını önce çıkar, sonra soruları farklı alt konulara dağıt.
- Gelişim Psikolojisi: temel kavram/ilkeler, gelişim görevleri, fiziksel-psikomotor, bilişsel, dil, kişilik, ahlak ve sosyal-duygusal gelişim.
- Öğrenme Psikolojisi: öğrenmeyi etkileyen etmenler, klasik/edimsel koşullanma, bağlaşımcılık, sosyal öğrenme, Gestalt, bilişsel öğrenme ve bilgiyi işleme.
- Program Geliştirme: program türleri, temeller, tasarım yaklaşımları, hedef-içerik-eğitim durumu-değerlendirme, modeller ve program değerlendirme.
- Öğretim İlke ve Yöntemleri: öğretim ilkeleri, strateji-yöntem-teknik ayrımı, anlatım/tartışma/örnek olay/problem/proje, bireysel öğretim, işbirlikli öğrenme ve çağdaş yaklaşımlar.
- Ölçme ve Değerlendirme: ölçekler, hata, geçerlik-güvenirlik-kullanışlılık, madde/test istatistikleri, ölçüt ve değerlendirme türleri, alternatif değerlendirme.
- Rehberlik: ilkeler, hizmet alanları, rehberlik türleri, bireyi tanıma teknikleri, psikolojik danışma, yöneltme ve özel eğitimle ilişkili temel uygulamalar.
- Sınıf Yönetimi: modeller, sınıfın fiziksel/sosyal düzeni, zaman, iletişim, motivasyon, kural geliştirme, istenmeyen davranış ve çatışma yönetimi.
- Bir üretim grubunda aynı alt konudan en fazla iki soru yaz; soru sayısı elverdiğince farklı alt konular kullan. Her sorunun "subtopic" alanında ölçtüğü alt konuyu belirt.

SORU KALİTESİ VE ÜSLUP:
- Uygulamadaki “KHK Çalışma Soruları 2025” düzeyini ve soru kurma biçimini örnek al; hiçbir mevcut soruyu veya kişi adını kopyalama.
- Bu ${total} soruda şu türleri dengeli ve dönüşümlü kullan: somut vaka/olay, I-II-III öncüllü, iki kavram veya kuramı karşılaştırma, “hangisi değildir/ulaşılamaz” biçiminde olumsuz kök, öğretmenin en uygun uygulamasını seçme, hata/yanılgı teşhisi, tablo-sonuç/ölçme verisi yorumlama ve neden-sonuç çıkarımı.
- Aynı soru türünü art arda en fazla iki kez kullan. Sadece kavram adı bulduran sorular toplamın en fazla %10'u olsun.
- Vaka sorularında her zaman öğrenci adı verme; bazen sınıf gözlemi, öğretmen kararı, veli görüşmesi, program komisyonu, rehberlik vakası, test sonucu veya okul süreci kullan.
- Bazı sorular kısa ve yoğun olabilir; fakat kısa soru da iki bilgiyi ayırt ettirmeli. İçeriği olmayan yapay uzunluk oluşturma.
- Soru kökü yalnız ezberi değil; ayırt etme, uygulama, yorumlama veya en uygun ilke/kavramı seçme becerisini ölçmeli.
- Soruların en az %80'i bilgi bakımından dolu, bağlamlı veya çoklu düşünme gerektiren yapıda olsun. Vaka sorularında en az iki anlamlı cümle bulunmalı.
- Çeldiriciler aynı konu ve kavram ailesinden, birbirine yakın güçte ve dilbilgisel olarak soru köküyle uyumlu olmalı. Alakasız, komik veya kolay elenen seçenek yazma.
- Doğru cevap seçenekler arasında dengeli dağılsın; sürekli aynı harfi kullanma.
- Gereksiz uzunluk, yapay dolgu, çift olumsuzluk, “hepsi/hiçbiri”, tartışmalı bilgi ve birden çok doğru cevap oluşturma.
- Her açıklama 2-4 cümle olsun: doğru kavramı gerekçelendir, sorudaki belirleyici ipucunu göster ve en güçlü çeldiriciden farkını kısaca açıkla.
- Alan terimlerini doğru kullan; günlük Türkçe akıcı, sınav dili ciddi ve temiz olsun.
- Her soru için bilgiyi gerçekten doğruladığın 1-3 sayfanın adını ve tam URL'sini infoSources alanına yaz. Arama sonucu adresi değil doğrudan sayfa adresi olsun; ziyaret etmediğin veya tahmin ettiğin URL'yi yazma.
- styleSource alanına, yalnız soru biçimini incelerken gerçekten açtığın örnek test sitesini yaz. Uygun biçim sayfası bulamazsan styleSource null olsun.

Yalnızca JSON döndür: {"questions":[{"area":"alan","subtopic":"ölçülen alt konu","type":"vaka|öncüllü|karşılaştırma|olumsuz kök|uygulama|hata teşhisi|veri yorumlama|neden-sonuç","question":"nitelikli soru","choices":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"2-4 cümlelik gerekçeli açıklama","infoSources":[{"name":"kurum veya yayın ve sayfa adı","url":"https://..."}],"styleSource":{"name":"site ve test adı","url":"https://..."}}]}`;
}
function splitEducationGroups(groups,size=7){
  const units=groups.flatMap(x=>Array.from({length:x.count},()=>x.area)),batches=[];
  for(let i=0;i<units.length;i+=size){
    const counts={};units.slice(i,i+size).forEach(area=>counts[area]=(counts[area]||0)+1);
    batches.push(Object.entries(counts).map(([area,count])=>({area,count})));
  }
  return batches;
}
async function createEducationBatch(groups,focus){
  const expected=groups.reduce((n,x)=>n+x.count,0);
  const raw=await openAIWebText(
    educationPrompt(groups,focus),
    "Sen Türk Eğitim Bilimleri alanının bütün alt konularına hâkim, KPSS ve KKTC KHK sınavlarının ölçme mantığını bilen titiz bir soru yazarı ve alan uzmanısın. Önce seçilen alanın alt konu haritasını kur; soruları birkaç popüler kavrama yığma. Her üretimde önce güvenilir bilgi kaynaklarını, sonra farklı soru biçimi örneklerini web'de araştır. MEB, YÖK, Türkiye'deki üniversiteler ve Türkçe hakemli akademik yayınlar bilgi doğrulama kaynaklarıdır. Sinavtime, OnlineSoru, SoruMarket, Sinavcoz ve Pegem benzeri test sayfaları yalnız biçim ve dağılım çeşitliliği içindir; içeriklerini kopyalama ve bilgi kaynağı olarak kullanma. Güvenilir kaynakla doğrulanamayan veya tartışmalı bilgiden soru yazma. Eğitim Felsefesi ve Eğitim Sosyolojisine girme. Sadece kavram adı soran seri üretim yapma; alt konuları ve türleri değiştir, bağlamlı, ayırt edici, güçlü çeldiricili ve tek kesin cevaplı maddeler yaz. Her soruda gerçekten kullanılan kaynak adını ve doğrudan URL'sini ver. Yalnızca istenen JSON'u döndür.",
    {maxOutputTokens:Math.max(2200,expected*520)}
  );
  const parsed=parseJsonResponse(raw);
  if(!Array.isArray(parsed.questions)||!parsed.questions.length)throw new Error("Eğitim Bilimleri soruları oluşturulamadı.");
  const valid=parsed.questions.filter(q=>q?.question&&q?.choices&&["A","B","C","D"].includes(q.answer)&&q.choices[q.answer]).slice(0,expected);
  if(valid.length!==expected)throw new Error(`AI ${expected} yerine ${valid.length} geçerli soru üretti. Lütfen yeniden dene.`);
  const sourced=valid.map(q=>({
    ...q,
    infoSources:Array.isArray(q.infoSources)?q.infoSources.map(x=>{
      const name=String(x?.name||"").trim(),url=trustedEducationSourceUrl(x?.url);
      return name?{name,url}:null;
    }).filter(Boolean).slice(0,3):[],
    styleSource:q.styleSource?.name?{
      name:String(q.styleSource.name).trim(),
      url:trustedQuestionStyleUrl(q.styleSource.url)
    }:null
  }));
  return sourced;
}
async function createEducationQuestionSet(groups,focus,onProgress=()=>{}){
  const batches=splitEducationGroups(groups),results=new Array(batches.length);let next=0,done=0;
  async function worker(){
    while(next<batches.length){
      const i=next++;results[i]=await createEducationBatch(batches[i],focus);
      done++;onProgress(done,batches.length);
    }
  }
  await Promise.all(Array.from({length:Math.min(3,batches.length)},worker));
  return results.flat().map((q,i)=>({id:`edu_${Date.now()}_${i}`,question:q.question,choices:q.choices,answer:q.answer,explanation:q.explanation,educationArea:q.area||groups[0].area,educationSubtopic:q.subtopic||"",questionType:q.type||"",sources:q.infoSources||[],styleSource:q.styleSource||null}));
}
async function generateEducationQuestions(groups,focus,title,statusSelector,buttonSelector){
  const status=$(statusSelector),button=$(buttonSelector);status.innerHTML='<div class="result">Soru türleri inceleniyor; MEB, YÖK, üniversite ve akademik kaynaklarda bilgiler doğrulanıyor…</div>';button.disabled=true;
  try{const qs=await createEducationQuestionSet(groups,focus,(done,total)=>status.innerHTML=`<div class="result">Kaynaklar doğrulanıyor · ${done}/${total} grup tamamlandı</div>`);startExam(shuffle(qs),title)}
  catch(e){status.innerHTML=`<div class="result">Hata: ${esc(e.message)}</div>`;button.disabled=false}
}
function renderCustomExamBuilder(){
  setTitle("Özel Deneme Oluştur","Bölümleri tek sınavda birleştir",true);
  const saved=store.get("customExamPreset",{});
  app.innerHTML=`<section class="hero custom-exam-hero"><h2>Kendi denemeni tasarla</h2><p>İstediğin müzik bölümlerinden ve Eğitim Bilimleri alanlarından istediğin kadar soru ekle. Seçimlerin tek sınavda karışık olarak birleşir.</p></section>
  <h3 class="section-title">Müzik Soru Bankası</h3><div class="builder-list">${state.data.sections.map(s=>`<label class="builder-row"><span><b>${esc(s.title)}</b><small>Bankada ${s.questions.length} soru</small></span><input class="builder-count" data-kind="local" data-id="${s.id}" type="number" min="0" max="${s.questions.length}" value="${Math.min(saved[`local:${s.id}`]||0,s.questions.length)}"></label>`).join("")}</div>
  <h3 class="section-title">Çevrimdışı Eğitim Bilimleri</h3><p class="muted">PDF’den aktarılan hazır sorular; AI veya internet gerekmez.</p><div class="builder-list">${offlineEducationSections().map(s=>`<label class="builder-row"><span><b>${esc(s.title)}</b><small>Bankada ${s.questions.length} soru</small></span><input class="builder-count" data-kind="offline-education" data-id="${s.id}" type="number" min="0" max="${s.questions.length}" value="${Math.min(saved[`offline-education:${s.id}`]||0,s.questions.length)}"></label>`).join("")}</div>
  <h3 class="section-title">AI Eğitim Bilimleri</h3><p class="muted">Seçilen sorular MEB, YÖK, üniversite ve Türkçe akademik kaynaklar taranarak hazırlanır.</p><div class="builder-list">${EDUCATION_AREAS.map(area=>`<label class="builder-row"><span><b>${esc(area)}</b><small>Kaynak doğrulamalı AI · Felsefe ve Sosyoloji hariç</small></span><input class="builder-count" data-kind="education" data-id="${esc(area)}" type="number" min="0" max="30" value="${saved[`education:${area}`]||0}"></label>`).join("")}</div>
  <div class="builder-summary"><span>Toplam soru</span><b id="builder-total">0</b></div>
  <div class="ai-control-grid"><div><label>Çözüm biçimi</label><select id="builder-mode"><option value="normal">Anında açıklamalı</option><option value="simulation">Sınav modu · geri bildirimsiz</option></select></div><div><label>Sınav süresi</label><select id="builder-minutes"><option>30</option><option selected>60</option><option>90</option><option>120</option></select></div></div>
  <div class="actions"><button class="secondary" id="builder-clear">Seçimleri Temizle</button><button class="primary" id="builder-start">Denemeyi Hazırla</button></div><div id="builder-status"></div>`;
  const update=()=>{$("#builder-total").textContent=[...document.querySelectorAll(".builder-count")].reduce((n,x)=>n+(+x.value||0),0);$("#builder-minutes").disabled=$("#builder-mode").value!=="simulation"};
  document.querySelectorAll(".builder-count").forEach(x=>x.oninput=update);$("#builder-mode").onchange=update;
  $("#builder-clear").onclick=()=>{document.querySelectorAll(".builder-count").forEach(x=>x.value=0);update()};
  $("#builder-start").onclick=startCustomExam;update();
}
async function startCustomExam(){
  const inputs=[...document.querySelectorAll(".builder-count")],preset={},local=[],offlineEducation=[],education=[];
  inputs.forEach(x=>{const count=Math.max(0,+x.value||0);preset[`${x.dataset.kind}:${x.dataset.id}`]=count;if(!count)return;if(x.dataset.kind==="local")local.push({id:x.dataset.id,count});else if(x.dataset.kind==="offline-education")offlineEducation.push({id:x.dataset.id,count});else education.push({area:x.dataset.id,count})});
  const total=[...local,...offlineEducation,...education].reduce((n,x)=>n+x.count,0),status=$("#builder-status");
  if(!total)return toast("En az bir bölümden soru ekle.");
  store.set("customExamPreset",preset);$("#builder-start").disabled=true;status.innerHTML='<div class="result">Bölümler birleştiriliyor…</div>';
  try{
    let qs=local.flatMap(x=>{const s=state.data.sections.find(y=>y.id===x.id);return shuffle(s.questions).slice(0,Math.min(x.count,s.questions.length))});
    qs=qs.concat(offlineEducation.flatMap(x=>{const s=offlineEducationSections().find(y=>y.id===x.id);return shuffle(s.questions).slice(0,Math.min(x.count,s.questions.length))}));
    if(education.length){status.innerHTML='<div class="result">Eğitim Bilimleri soruları AI tarafından hazırlanıyor…</div>';qs=qs.concat(await createEducationQuestionSet(education,"Özel deneme için bilgi, kavram ve vaka soruları"))}
    qs=shuffle(qs);const mode=$("#builder-mode").value;
    if(mode==="simulation")startSimulationWithQuestions(qs,+$("#builder-minutes").value,"Özel Deneme");
    else startExam(qs,"Özel Deneme");
  }catch(e){status.innerHTML=`<div class="result">Hata: ${esc(e.message)}</div>`;$("#builder-start").disabled=false}
}
function startSimulationWithQuestions(questions,minutes,title="Gerçek Sınav"){
  clearInterval(state.simulationTimer);
  state.activeSavedTestId=null;
  state.eliminatedChoices={};state.eliminationMode=false;
  state.simulation={questions,answers:{},marked:[],timeSpent:{},activeQuestionId:null,questionEnteredAt:0,index:0,startedAt:Date.now(),endsAt:Date.now()+minutes*60000,minutes,title};
  renderSimulationQuestion();
  state.simulationTimer=setInterval(()=>{const s=state.simulation;if(!s)return clearInterval(state.simulationTimer);if(Date.now()>=s.endsAt)finishSimulation(true);else updateSimulationClock()},1000);
}
const AI_MODELS=["gpt-4.1-mini","gpt-5-mini","gpt-5","gpt-4.1"];
const AI_MODES={
  "AI Öğretmen":"Konuyu öğret: önce anlaşılır biçimde anlat, ardından ezberlenecek maddeleri, karıştırılan kavramları, bir hafıza tekniğini ve kısa kontrol sorularını ver.",
  "Serbest Soru":"Kullanıcının sorusunu doğrudan, açık ve öğretici biçimde yanıtla. Gerektiğinde kısa örnek ver.",
  "Soru Üretici":"İstenen konuda dört seçenekli özgün test soruları üret. Her sorunun doğru cevabını ve kısa açıklamasını ver. Çıktıyı numaralı düzenle.",
  "Çalışma Planı":"Kullanıcının isteğine göre uygulanabilir, günlere bölünmüş çalışma planı hazırla. Tekrar, test ve yanlış analizi sürelerini belirt.",
  "Yanlış Analizi":"Verilen yanlışları analiz et. Doğru cevabı, çeldiricilerin neden yanlış olduğunu, hafıza tekniğini ve üç benzer soru ver."
};
function modelOptions(selected){return AI_MODELS.map(m=>`<option value="${m}" ${m===selected?"selected":""}>${m}${m==="gpt-4.1-mini"?" · En hızlı":""}</option>`).join("")}
function renderSettings(){
  const selected=store.get("aiModel","gpt-4.1-mini");
  setTitle("Ayarlar","AI ve uygulama",true);app.innerHTML=`<section class="hero"><h2>OpenAI ayarları</h2><p>API anahtarı yalnızca bu cihazda saklanır. Paylaşma veya ekran görüntüsünde gösterme.</p></section><label>OpenAI API anahtarı</label><input id="api-key" type="password" value="${esc(store.get("apiKey",""))}" placeholder="sk-..."><label>AI modeli</label><select id="ai-model">${modelOptions(selected)}</select><label>Realtime oturum sunucusu (önerilen)</label><input id="realtime-endpoint" type="text" value="${esc(store.get("realtimeEndpoint",""))}" placeholder="https://sunucun.com/session"><p class="muted">Boş bırakırsan Realtime bağlantısı cihazdaki API anahtarını kullanır. En güvenlisi kısa ömürlü oturum anahtarı veren kendi sunucunu kullanmaktır.</p><label>AI çalışma talimatı</label><textarea id="instructions">${esc(store.get("instructions","Türkçe konuş. Müzik ve eğitim bilimleri sınavına hazırlanan bir öğretmene kısa, doğru ve öğretici cevaplar ver. İstenirse birer birer soru sor ve cevabı açıklayarak değerlendir."))}</textarea><div class="actions"><button class="primary" id="save-settings">Kaydet</button></div>`;
  $("#save-settings").onclick=()=>{store.set("apiKey",$("#api-key").value.trim());store.set("aiModel",$("#ai-model").value);store.set("realtimeEndpoint",$("#realtime-endpoint").value.trim());store.set("instructions",$("#instructions").value.trim());toast("Ayarlar kaydedildi")};
}
function waitFor(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function responseOutputText(response){
  if(response?.status==="incomplete")throw new Error("AI yanıtı tamamlanmadan kesildi. Otomatik olarak yeniden denenecek.");
  const content=(response?.output||[]).flatMap(item=>item?.content||[]),refusal=content.find(item=>item?.type==="refusal")?.refusal;
  if(refusal)throw new Error(`AI bu isteği yanıtlamadı: ${refusal}`);
  const text=String(response?.output_text||content.filter(item=>item?.type==="output_text").map(item=>item.text||"").join("\n")).trim();
  if(!text)throw new Error("AI boş yanıt döndürdü. Otomatik olarak yeniden denenecek.");
  return text;
}
async function requestOpenAIResponse(body,key,options={}){
  const timeoutMs=Math.max(50,+options.timeoutMs||60000),attempts=Math.max(1,+options.networkAttempts||1);let lastError;
  for(let attempt=1;attempt<=attempts;attempt++){
    const controller=typeof AbortController!=="undefined"?new AbortController():null;let timer;
    try{
      const request=(async()=>{
        const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify(body),signal:controller?.signal});
        let payload={};try{payload=await response.json()}catch{}
        if(!response.ok){const error=new Error(payload?.error?.message||`OpenAI HTTP ${response.status}`);error.status=response.status;error.retryable=[408,409,429,500,502,503,504].includes(response.status);throw error}
        return payload;
      })();
      const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller?.abort();const error=new Error(`AI araştırması ${Math.max(1,Math.round(timeoutMs/1000))} saniyede tamamlanamadı.`);error.retryable=true;reject(error)},timeoutMs)});
      return await Promise.race([request,timeout]);
    }catch(error){
      if(error&&error.retryable===undefined&&!error.status)error.retryable=true;
      lastError=error;
      if(attempt>=attempts||error?.retryable===false||[400,401,403,404].includes(error?.status))throw error;
      await waitFor(Math.min(3600,900*attempt+Math.floor(Math.random()*500)));
    }finally{if(timer)clearTimeout(timer)}
  }
  throw lastError||new Error("OpenAI yanıtı alınamadı.");
}
async function openAIText(input,instructions="",options={}){
  const key=store.get("apiKey","");if(!key)throw new Error("Önce Ayarlar bölümüne API anahtarını gir.");
  const model=options.model||store.get("aiModel","gpt-4.1-mini"),body={model,instructions:instructions||store.get("instructions","Türkçe konuş ve öğretici ol."),input,max_output_tokens:options.maxOutputTokens||1800};
  if(/^gpt-5/.test(model))body.reasoning={effort:"minimal"};
  const response=await requestOpenAIResponse(body,key,{timeoutMs:options.timeoutMs||60000,networkAttempts:options.networkAttempts||1});return responseOutputText(response);
}
function topicLessonHtml(){
  return `<div class="topic-lesson-actions"><button class="secondary topic-lesson-button" id="topic-lesson-button" aria-expanded="false">📚 Konu Anlatımı</button></div>
  <div class="topic-lesson-box hidden" id="topic-lesson-box" aria-live="polite"><b>Kısa Konu Anlatımı</b><div id="topic-lesson-content" class="selectable-study-text"></div><p class="sentence-save-hint">📌 Kaydetmek istediğin cümleye basılı tutup seç.</p></div>`;
}
function topicLessonPrompt(q){
  const choices=Object.entries(q.choices||{}).map(([key,value])=>`${key}) ${value}`).join("\n");
  return `Bu sorunun ölçtüğü ana konuyu belirle ve kullanıcıya kısa bir konu anlatımı hazırla.
Alan: ${isEducationQuestion(q)?"Eğitim Bilimleri":"Müzik"} / ${questionAreaLabel(q)}
Soru: ${q.question}
Seçenekler:
${choices}
Doğru cevap: ${q.answer}) ${q.choices[q.answer]}

Şu düzeni kullan:
Konu:
Temel açıklama:
Karıştırılan noktalar:
Kısa örnek:
Hafıza ipucu:

Soruyu yeniden çözmek yerine konuyu öğret. 280 kelimeyi geçme; doğal, açık ve sınav odaklı Türkçe kullan.`;
}
function mountTopicLesson(q,options={}){
  const button=$("#topic-lesson-button"),box=$("#topic-lesson-box"),content=$("#topic-lesson-content");
  if(!button||!box||!content)return;
  content.dataset.saveSource=`${isEducationQuestion(q)?"Eğitim Bilimleri":"Müzik"} · ${questionAreaLabel(q)} · Konu Anlatımı`;
  const cacheKey=`topic|${questionStateKey(q)}|${q.answer}`;
  button.onclick=async()=>{
    if(!box.classList.contains("hidden")){
      box.classList.add("hidden");button.setAttribute("aria-expanded","false");button.textContent="📚 Konu Anlatımı";return;
    }
    const shouldWarn=options.simulation||Boolean(options.warnBeforeReveal?.());
    if(shouldWarn&&!state.aiTopicLessons[cacheKey]&&!confirm("Konu anlatımı sorunun cevabına ilişkin ipucu verebilir. Devam etmek istiyor musun?"))return;
    box.classList.remove("hidden");button.setAttribute("aria-expanded","true");
    if(state.aiTopicLessons[cacheKey]){content.textContent=state.aiTopicLessons[cacheKey];button.textContent="📕 Konu Anlatımını Gizle";return}
    button.disabled=true;button.textContent="Konu hazırlanıyor…";content.textContent="AI bu sorunun bağlı olduğu konuyu belirliyor…";
    try{
      const lesson=await openAIText(topicLessonPrompt(q),"Sen deneyimli bir müzik ve Eğitim Bilimleri öğretmenisin. Tek sorudan hareketle konuyu kısa ders biçiminde, doğal Türkçe ve sınav odaklı anlat. Gereksiz giriş ve genel nasihat yazma.",{maxOutputTokens:850});
      state.aiTopicLessons[cacheKey]=lesson;content.textContent=lesson;button.textContent="📕 Konu Anlatımını Gizle";
    }catch(error){content.textContent=`Hata: ${error.message}`;button.textContent="↻ Konu Anlatımını Yeniden Dene"}
    finally{button.disabled=false}
  };
}
function distractorLabHtml(q,selected){
  return `<div class="distractor-lab"><button class="secondary distractor-lab-button" id="distractor-lab-button">🧪 Çeldirici Laboratuvarı</button>
  <div class="distractor-lab-box hidden" id="distractor-lab-box"><b>Neden bu şık cazip göründü?</b><div id="distractor-lab-content"></div></div></div>`;
}
function distractorPrompt(q,selected){
  return `Kullanıcının yaptığı yanlışı çeldirici mantığı açısından incele.
Alan/Konu: ${questionAreaLabel(q)}
Soru: ${q.question}
Kullanıcının seçtiği yanlış: ${selected}) ${q.choices[selected]}
Doğru cevap: ${q.answer}) ${q.choices[q.answer]}
Diğer seçenekler: ${Object.entries(q.choices).map(([k,v])=>`${k}) ${v}`).join(" | ")}

Yalnız şu başlıklarla, doğal bir öğretmen diliyle yaz:
Bu şık neden cazipti?
Hangi durumda doğru olabilirdi?
Kritik ayrım
Bir daha yanılmamak için kontrol cümlesi

Kullanıcıyı suçlama. 230 kelimeyi geçme.`;
}
function mountDistractorLab(q,selected){
  const button=$("#distractor-lab-button"),box=$("#distractor-lab-box"),content=$("#distractor-lab-content");
  if(!button||!box||!content)return;
  const cacheKey=`distractor|${questionStateKey(q)}|${selected}`;
  button.onclick=async()=>{
    if(!box.classList.contains("hidden")){box.classList.add("hidden");button.textContent="🧪 Çeldirici Laboratuvarı";return}
    box.classList.remove("hidden");
    if(state.aiDistractorAnalyses[cacheKey]){content.textContent=state.aiDistractorAnalyses[cacheKey];button.textContent="🧪 Analizi Gizle";return}
    button.disabled=true;button.textContent="Çeldirici inceleniyor…";content.textContent="Seçtiğin şıkkın yanıltma mantığı çözümleniyor…";
    try{
      const analysis=await openAIText(distractorPrompt(q,selected),"Sen sınavlarda çeldirici yazımı ve kavram yanılgıları konusunda uzman bir öğretmensin. Seçilen yanlış şıkkı doğru şıkla karşılaştır; kısa, somut ve yargılamayan Türkçe kullan.",{maxOutputTokens:700});
      state.aiDistractorAnalyses[cacheKey]=analysis;content.textContent=analysis;button.textContent="🧪 Analizi Gizle";
    }catch(error){content.textContent=`Hata: ${error.message}`;button.textContent="↻ Laboratuvarı Yeniden Aç"}
    finally{button.disabled=false}
  };
}
function mountResultDistractorLabs(results){
  document.querySelectorAll("[data-result-lab]").forEach(button=>{
    const index=+button.dataset.resultLab,item=results[index],box=document.querySelector(`[data-result-lab-box="${index}"]`),content=box?.querySelector("div");
    if(!item?.selected||!box||!content)return;
    button.onclick=async()=>{
      if(!box.classList.contains("hidden")){box.classList.add("hidden");button.textContent="🧪 Bu Çeldiriciyi İncele";return}
      box.classList.remove("hidden");const cacheKey=`distractor|${questionStateKey(item.q)}|${item.selected}`;
      if(state.aiDistractorAnalyses[cacheKey]){content.textContent=state.aiDistractorAnalyses[cacheKey];button.textContent="🧪 Analizi Gizle";return}
      button.disabled=true;button.textContent="Çeldirici inceleniyor…";content.textContent="Analiz hazırlanıyor…";
      try{
        const analysis=await openAIText(distractorPrompt(item.q,item.selected),"Sen sınavlarda çeldirici yazımı ve kavram yanılgıları konusunda uzman bir öğretmensin. Seçilen yanlış şıkkı doğru şıkla karşılaştır; kısa, somut ve yargılamayan Türkçe kullan.",{maxOutputTokens:700});
        state.aiDistractorAnalyses[cacheKey]=analysis;content.textContent=analysis;button.textContent="🧪 Analizi Gizle";
      }catch(error){content.textContent=`Hata: ${error.message}`;button.textContent="↻ Yeniden Dene"}
      finally{button.disabled=false}
    };
  });
}
function autopsyLocalData(results){
  const wrong=results.filter(x=>!x.ok&&x.selected),blank=results.filter(x=>!x.selected);
  const negative=wrong.filter(x=>/\b(değildir|yanlıştır|söylenemez|beklenmez|olamaz)\b/i.test(x.q.question));
  const fast=wrong.filter(x=>(x.durationSeconds||999)<=12),slow=wrong.filter(x=>(x.durationSeconds||0)>=60);
  const areas={};wrong.forEach(x=>{const area=questionAreaLabel(x.q);areas[area]=(areas[area]||0)+1});
  const topAreas=Object.entries(areas).sort((a,b)=>b[1]-a[1]).slice(0,3);
  return {wrong,blank,negative,fast,slow,topAreas};
}
function examAutopsyHtml(results,title){
  const x=autopsyLocalData(results),avg=results.length?Math.round(results.reduce((n,r)=>n+(r.durationSeconds||0),0)/results.length):0;
  return `<section class="autopsy-panel"><div class="autopsy-heading"><div><small>DENEME ANALİZİ</small><h2>Sınav Sonu Otopsisi</h2></div><span>${esc(title)}</span></div>
  <div class="autopsy-grid">
    <article><b>${x.wrong.length}</b><span>Yanlış cevap</span></article>
    <article><b>${x.blank.length}</b><span>Boş bırakılan</span></article>
    <article><b>${x.fast.length}</b><span>12 sn altı hızlı yanlış</span></article>
    <article><b>${avg||"—"}</b><span>Ort. cevap süresi (sn)</span></article>
  </div>
  <div class="autopsy-findings">
    <p><b>Öncelikli alanlar:</b> ${x.topAreas.length?x.topAreas.map(([a,n])=>`${esc(a)} (${n})`).join(" · "):"Belirgin zayıf alan yok."}</p>
    <p><b>Okuma riski:</b> ${x.negative.length?`${x.negative.length} yanlış, olumsuz soru kökünde yapıldı.`:"Olumsuz soru köklerinde belirgin hata görünmedi."}</p>
    <p><b>Süre sinyali:</b> ${x.fast.length?`${x.fast.length} yanlış çok hızlı işaretlendi.`:"Acele işaretleme sinyali yok."} ${x.slow.length?`${x.slow.length} yanlışta 60 saniyeden fazla kalındı.`:""}</p>
  </div>
  <div class="actions"><button class="primary" id="ai-autopsy">🧠 AI Detaylı Otopsi</button><button class="secondary" id="print-autopsy">🖨 PDF Olarak İndir / Yazdır</button></div>
  <div class="report-output hidden" id="autopsy-output"></div></section>`;
}
function autopsyPrompt(results,title){
  const items=results.filter(x=>!x.ok).slice(0,30).map((x,i)=>({
    no:i+1,konu:questionAreaLabel(x.q),soru:x.q.question,
    kullanici:x.selected?`${x.selected}) ${x.q.choices[x.selected]}`:"Boş",
    dogru:`${x.q.answer}) ${x.q.choices[x.q.answer]}`,sure:x.durationSeconds||null
  }));
  return `Bu denemenin sınav sonu otopsisini hazırla.
Deneme: ${title}
Toplam: ${results.length}; doğru: ${results.filter(x=>x.ok).length}; yanlış: ${results.filter(x=>!x.ok&&x.selected).length}; boş: ${results.filter(x=>!x.selected).length}
Hatalar: ${JSON.stringify(items)}

Metin, öğrencinin kâğıdını dikkatle incelemiş deneyimli bir öğretmen tarafından yazılmış gibi doğal olsun. Genel motivasyon cümleleri kullanma. Şu bölümleri yaz:
GENEL TEŞHİS
BİLGİ EKSİKLİKLERİ
KARIŞTIRILAN KAVRAMLAR VE ÇELDİRİCİLER
OKUMA / SÜRE HATALARI
SONRAKİ ÇALIŞMA PAKETİ
Yalnız verinin desteklediği çıkarımları yap. 650-900 kelime aralığında yaz.`;
}
function mountExamAutopsy(results,title){
  const button=$("#ai-autopsy"),output=$("#autopsy-output"),print=$("#print-autopsy");
  if(!button||!output||!print)return;
  let report="";
  button.onclick=async()=>{
    output.classList.remove("hidden");
    if(report){output.textContent=report;return}
    button.disabled=true;button.textContent="Otopsi hazırlanıyor…";output.textContent="Yanlışlar, süre ve konu dağılımı inceleniyor…";
    try{
      report=await openAIText(autopsyPrompt(results,title),"Sen deneyimli bir sınav koçu ve alan öğretmenisin. Öğrencinin gerçek cevap verilerinden, doğal ve somut bir sınav sonu değerlendirmesi yaz. Robotik kalıplar ve boş övgüler kullanma.",{maxOutputTokens:2200});
      output.textContent=report;button.textContent="🧠 AI Otopsisi Hazır";
    }catch(error){output.textContent=`Hata: ${error.message}`;button.textContent="↻ Otopsiyi Yeniden Hazırla"}
    finally{button.disabled=false}
  };
  print.onclick=()=>{
    const x=autopsyLocalData(results);
    const local=`Sonuç: ${results.filter(r=>r.ok).length} doğru, ${x.wrong.length} yanlış, ${x.blank.length} boş.\n\nÖncelikli alanlar: ${x.topAreas.map(([a,n])=>`${a} (${n})`).join(", ")||"Belirgin zayıf alan yok."}\n\n${report||"Ayrıntılı AI raporu henüz hazırlanmadı. Daha kapsamlı PDF için önce “AI Detaylı Otopsi” düğmesine bas."}`;
    printTextReport(`Sınav Sonu Otopsisi – ${title}`,local);
  };
}
function musicMistakeDataset(){
  const unresolved=savedWrongQuestions("wrongMusicQuestions"),history=mistakeHistory().filter(x=>x.subject==="music");
  const map=new Map();
  history.forEach(x=>map.set(`${x.questionId}|${x.selected}`,x));
  unresolved.forEach(q=>{
    if(![...map.values()].some(x=>x.questionId===q.id))map.set(`${q.id}|unknown`,{
      questionId:q.id,question:q.question,choices:q.choices,answer:q.answer,selected:"",
      area:questionAreaLabel(q),count:1,lastDate:""
    });
  });
  return [...map.values()].sort((a,b)=>(b.count||1)-(a.count||1));
}
function renderMusicWrongAnalysis(){
  const items=musicMistakeDataset(),last=store.get("latestMusicWrongReport",null);
  setTitle("AI Müzik Yanlışları",`${items.length} yanlış örüntüsü`,true);
  app.innerHTML=`<section class="hero music-report-hero"><h2>Yanlışlarından kişisel ders notu</h2><p>AI yalnız müzik alanındaki yanlışlarını; seçtiğin çeldiricileri, tekrar sayılarını ve konu dağılımını inceler. Sonuç, bir öğretmenin sana özel hazırladığı çalışma özeti gibi yazılır.</p>
  <div class="music-report-stats"><span><b>${savedWrongQuestions("wrongMusicQuestions").length}</b> güncel yanlış</span><span><b>${items.reduce((n,x)=>n+(x.count||1),0)}</b> toplam hata kaydı</span><span><b>${new Set(items.map(x=>x.area)).size}</b> konu</span></div>
  <div class="actions"><button class="primary" id="generate-music-report" ${items.length?"":"disabled"}>🧬 Kişisel Özeti Hazırla</button><button class="secondary" id="print-music-report" ${last?.text?"":"disabled"}>🖨 PDF Olarak İndir / Yazdır</button></div></section>
  <div class="report-output ${last?.text?"":"hidden"}" id="music-report-output">${last?.text?esc(last.text):""}</div>
  ${items.length?`<h3 class="section-title">Analize girecek başlıca yanlışlar</h3><div class="list">${items.slice(0,12).map(x=>`<article class="list-item"><h3>${esc(x.area||"Müzik")}</h3><p>${esc(x.question)}</p><small>${x.selected?`Seçilen: ${esc(x.selected)}) ${esc(x.choices?.[x.selected]||"")}`:"Eski kayıtta seçilen şık bilgisi yok"} · Doğru: ${esc(x.answer)}) ${esc(x.choices?.[x.answer]||"")} · ${x.count||1} kez</small></article>`).join("")}</div>`:`<div class="result">Müzik alanında kayıtlı yanlış bulunmuyor.</div>`}`;
  const output=$("#music-report-output"),print=$("#print-music-report");
  if(last?.text)state.activeReport=last;
  $("#generate-music-report").onclick=()=>generateMusicWrongReport(items);
  print.onclick=()=>{const r=state.activeReport||last;if(r?.text)printTextReport("AI Müzik Yanlışları – Kişisel Çalışma Özeti",r.text)};
}
async function generateMusicWrongReport(items){
  const button=$("#generate-music-report"),output=$("#music-report-output"),print=$("#print-music-report");
  output.classList.remove("hidden");button.disabled=true;button.textContent="Yanlışlar inceleniyor…";output.textContent="Konu kümeleri, tekrar eden hatalar ve seçilen çeldiriciler analiz ediliyor…";
  const data=items.slice(0,40).map(x=>({
    konu:x.area,soru:x.question,secilen:x.selected?x.choices?.[x.selected]:"Eski kayıtta bilinmiyor",
    dogru:x.choices?.[x.answer],tekrar:x.count||1
  }));
  const prompt=`Aşağıdaki müzik öğretmenliği sınavı yanlışlarına göre kişisel çalışma özeti hazırla:\n${JSON.stringify(data)}

Bu metin, öğrencinin yanlış kâğıtlarını inceleyen deneyimli bir müzik öğretmeninin kendi eliyle hazırladığı gibi doğal ve seçici olsun. Soruları tek tek tekrar etme. Ortak bilgi eksiklerini ve karıştırılan eşleşmeleri kümelendir.

Şu bölümleri kullan:
KISA ÖĞRETMEN NOTU
ÖNCELİKLİ KONU ÖZETLERİ
KARIŞTIRILAN ESER – BESTECİ – DÖNEM EŞLEŞMELERİ
ÇELDİRİCİLERİN ORTAK TUZAKLARI
EZBERLENMESİ GEREKEN NET BİLGİLER
15 DAKİKALIK SON TEKRAR PLANI

Her bilgi maddesi kısa ama öğretici olsun. Veride olmayan ayrıntıları uydurma; genel geçer boş tavsiye yazma. 800-1200 kelime aralığında Türkçe yaz.`;
  try{
    const text=await openAIText(prompt,"Sen müzik tarihi, müzik teorisi, çalgı bilgisi, Türk müziği ve müzik eğitimi alanlarında deneyimli bir sınav öğretmenisin. Kullanıcının gerçek yanlışlarından doğal, düzenli, sınav odaklı kişisel ders notu çıkar.",{maxOutputTokens:2600});
    const report={text,date:new Date().toISOString(),count:items.length};store.set("latestMusicWrongReport",report);state.activeReport=report;
    output.textContent=text;button.textContent="↻ Özeti Yeniden Hazırla";print.disabled=false;
    print.onclick=()=>printTextReport("AI Müzik Yanlışları – Kişisel Çalışma Özeti",text);
  }catch(error){output.textContent=`Hata: ${error.message}`;button.textContent="↻ Özeti Yeniden Dene"}
  finally{button.disabled=false}
}
let embeddedPdfFonts=null;
function arrayBufferToBase64(buffer){
  const bytes=new Uint8Array(buffer);let binary="";
  for(let i=0;i<bytes.length;i+=0x8000){
    binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  }
  return btoa(binary);
}
async function loadEmbeddedPdfFonts(){
  if(embeddedPdfFonts)return embeddedPdfFonts;
  const [regular,bold]=await Promise.all([
    fetch("DejaVuSerif.ttf").then(r=>{if(!r.ok)throw new Error("PDF yazı tipi yüklenemedi.");return r.arrayBuffer()}),
    fetch("DejaVuSerif-Bold.ttf").then(r=>{if(!r.ok)throw new Error("PDF kalın yazı tipi yüklenemedi.");return r.arrayBuffer()})
  ]);
  embeddedPdfFonts={regular:arrayBufferToBase64(regular),bold:arrayBufferToBase64(bold)};
  return embeddedPdfFonts;
}
function cleanPdfText(value){
  return String(value||"")
    .replace(/\r\n?/g,"\n")
    .replace(/\*\*([^*]+)\*\*/g,"$1")
    .replace(/^#{1,6}\s*/gm,"")
    .replace(/[ \t]+\n/g,"\n")
    .trim();
}
function isPdfHeading(line){
  const value=line.trim().replace(/^[\dIVXÇĞİÖŞÜ().-]+\s*/i,"");
  if(!value||value.length>95)return false;
  return value===value.toLocaleUpperCase("tr-TR")&&/[A-ZÇĞİÖŞÜ]/.test(value);
}
async function buildTextPdf(title,text){
  const content=cleanPdfText(text);
  if(content.length<20)throw new Error("PDF'ye yazılacak içerik boş.");
  const JsPdf=window.jspdf?.jsPDF;
  if(!JsPdf)throw new Error("PDF oluşturucu yüklenemedi.");
  const fonts=await loadEmbeddedPdfFonts();
  const pdf=new JsPdf({unit:"mm",format:"a4",orientation:"portrait",compress:true,putOnlyUsedFonts:true});
  pdf.addFileToVFS("DejaVuSerif.ttf",fonts.regular);
  pdf.addFont("DejaVuSerif.ttf","DejaVuSerif","normal");
  pdf.addFileToVFS("DejaVuSerif-Bold.ttf",fonts.bold);
  pdf.addFont("DejaVuSerif-Bold.ttf","DejaVuSerif","bold");

  const pageWidth=pdf.internal.pageSize.getWidth(),pageHeight=pdf.internal.pageSize.getHeight();
  const left=17,right=17,top=19,bottom=18,usableWidth=pageWidth-left-right;
  let y=top;
  const addPage=()=>{pdf.addPage();y=top};
  const ensureSpace=needed=>{if(y+needed>pageHeight-bottom)addPage()};
  const writeWrapped=(value,{size=10.5,bold=false,gap=2,lineHeight=5.25,color=[31,41,55]}={})=>{
    const lines=pdf.splitTextToSize(value,usableWidth);
    const needed=Math.max(lineHeight,lines.length*lineHeight)+gap;
    ensureSpace(needed);
    pdf.setFont("DejaVuSerif",bold?"bold":"normal");
    pdf.setFontSize(size);pdf.setTextColor(...color);
    pdf.text(lines,left,y,{baseline:"top"});
    y+=lines.length*lineHeight+gap;
  };

  pdf.setFillColor(20,55,86);pdf.roundedRect(left,y,usableWidth,24,2,2,"F");
  pdf.setFont("DejaVuSerif","bold");pdf.setFontSize(16);pdf.setTextColor(255,255,255);
  const titleLines=pdf.splitTextToSize(cleanPdfText(title),usableWidth-10).slice(0,2);
  pdf.text(titleLines,left+5,y+5,{baseline:"top"});
  y+=28;
  const profile=store.get("profile",{name:""});
  const meta=[profile.name||"",new Date().toLocaleDateString("tr-TR")].filter(Boolean).join(" · ");
  if(meta)writeWrapped(meta,{size:9,gap:4,color:[80,91,105]});

  const blocks=content.split(/\n/);
  for(const raw of blocks){
    const line=raw.trim();
    if(!line){y+=2.5;continue}
    if(isPdfHeading(line)){
      ensureSpace(13);
      if(y>top+32){pdf.setDrawColor(199,210,221);pdf.line(left,y,left+usableWidth,y);y+=3}
      writeWrapped(line,{size:12,bold:true,gap:3,color:[20,55,86]});
    }else{
      writeWrapped(line,{size:10.3,bold:false,gap:1.8,lineHeight:5.15});
    }
  }

  const pages=pdf.getNumberOfPages();
  for(let page=1;page<=pages;page++){
    pdf.setPage(page);pdf.setDrawColor(210,218,226);pdf.line(left,pageHeight-12,left+usableWidth,pageHeight-12);
    pdf.setFont("DejaVuSerif","normal");pdf.setFontSize(8);pdf.setTextColor(95,105,117);
    pdf.text("Müzik Sınavı V26.28 · Kişisel çalışma çıktısı",left,pageHeight-8);
    pdf.text(`${page} / ${pages}`,pageWidth-right,pageHeight-8,{align:"right"});
  }
  const arrayBuffer=pdf.output("arraybuffer");
  if(!arrayBuffer||arrayBuffer.byteLength<5000)throw new Error("PDF içeriği doğrulanamadı; boş dosya kaydedilmedi.");
  return {pdf,arrayBuffer,base64:arrayBufferToBase64(arrayBuffer),pages};
}
async function printTextReport(title,text){
  const filename=`${title.replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"")||"calisma-ozeti"}.pdf`;
  try{
    toast("PDF hazırlanıyor…");
    const built=await buildTextPdf(title,text);
    const nativeSaver=window.Capacitor?.Plugins?.PdfSaver;
    const isAndroid=window.Capacitor?.getPlatform?.()==="android";
    if(isAndroid&&nativeSaver){
      const result=await nativeSaver.save({base64:built.base64,filename});
      toast(result?.saved?`PDF ${built.pages} sayfa ve dolu olarak kaydedildi.`:"PDF kaydetme iptal edildi.");
    }else{
      built.pdf.save(filename);
      toast(`PDF ${built.pages} sayfa olarak indirildi.`);
    }
  }catch(error){toast(`PDF hazırlanamadı: ${error.message}`)}
}

async function buildPrintableExamPdf(title,questions){
  if(!Array.isArray(questions)||!questions.length)throw new Error("Yazdırılacak soru bulunamadı.");
  const JsPdf=window.jspdf?.jsPDF;
  if(!JsPdf)throw new Error("PDF oluşturucu yüklenemedi.");
  const fonts=await loadEmbeddedPdfFonts();
  const pdf=new JsPdf({unit:"mm",format:"a4",orientation:"portrait",compress:true,putOnlyUsedFonts:true});
  pdf.addFileToVFS("DejaVuSerif.ttf",fonts.regular);pdf.addFont("DejaVuSerif.ttf","DejaVuSerif","normal");
  pdf.addFileToVFS("DejaVuSerif-Bold.ttf",fonts.bold);pdf.addFont("DejaVuSerif-Bold.ttf","DejaVuSerif","bold");
  const pageWidth=pdf.internal.pageSize.getWidth(),pageHeight=pdf.internal.pageSize.getHeight();
  const left=16,right=16,top=17,bottom=17,width=pageWidth-left-right;
  let y=top,section="questions";
  const addPage=()=>{pdf.addPage();y=top};
  const ensure=needed=>{if(y+needed>pageHeight-bottom)addPage()};
  const write=(value,{size=10,bold=false,gap=1.8,lineHeight=4.8,indent=0}={})=>{
    pdf.setFont("DejaVuSerif",bold?"bold":"normal");pdf.setFontSize(size);pdf.setTextColor(24,32,44);
    const lines=pdf.splitTextToSize(cleanPdfText(value),width-indent),needed=lines.length*lineHeight+gap;
    ensure(needed);pdf.text(lines,left+indent,y,{baseline:"top"});y+=needed;
  };
  const heading=(name,subtitle)=>{
    pdf.setFillColor(20,55,86);pdf.roundedRect(left,y,width,22,2,2,"F");
    pdf.setFont("DejaVuSerif","bold");pdf.setFontSize(15);pdf.setTextColor(255,255,255);
    pdf.text(pdf.splitTextToSize(name,width-10).slice(0,2),left+5,y+4.5,{baseline:"top"});y+=26;
    if(subtitle)write(subtitle,{size:9,gap:3});
  };
  heading(title,`${questions.length} soru · A–E beş seçenek · Cevap anahtarı ayrı bölümdedir`);
  pdf.setDrawColor(80,91,105);pdf.setLineWidth(.25);
  write("Ad Soyad: ____________________________________     Tarih: ____ / ____ / ______     Puan: ______",{size:9.2,gap:5});
  questions.forEach((q,index)=>{
    const choiceLines=Object.entries(q.choices||{}).map(([key,value])=>`${key}) ${value}`);
    const estimate=9+pdf.splitTextToSize(`${index+1}. ${q.question}`,width).length*4.9+choiceLines.reduce((n,line)=>n+pdf.splitTextToSize(line,width-5).length*4.5,0);
    ensure(Math.min(estimate,55));
    write(`${index+1}. ${q.question}`,{size:10.2,bold:true,gap:2,lineHeight:5});
    choiceLines.forEach(line=>write(line,{size:9.7,gap:.9,lineHeight:4.5,indent:5}));
    y+=2.2;
  });
  addPage();section="answers";
  heading("CEVAP ANAHTARI",`${title} · Bu bölüm deneme çözüldükten sonra kontrol edilmelidir.`);
  const answerRows=[];
  for(let i=0;i<questions.length;i+=10)answerRows.push(questions.slice(i,i+10).map((q,j)=>`${i+j+1}-${q.answer}`).join("     "));
  answerRows.forEach(row=>write(row,{size:10.3,bold:true,gap:3}));
  y+=3;write("KISA AÇIKLAMALAR",{size:12,bold:true,gap:4});
  questions.forEach((q,index)=>write(`${index+1}. ${q.answer} — ${q.explanation||"Doğru cevap, soru kökündeki bilgiye göre bu seçenektir."}`,{size:9.1,gap:2.3,lineHeight:4.5}));
  const pages=pdf.getNumberOfPages();
  for(let page=1;page<=pages;page++){
    pdf.setPage(page);pdf.setDrawColor(205,214,224);pdf.line(left,pageHeight-11,left+width,pageHeight-11);
    pdf.setFont("DejaVuSerif","normal");pdf.setFontSize(7.5);pdf.setTextColor(91,102,116);
    pdf.text("Müzik Sınavı V26.28 · tekrarsız 2026 gerçek sınav tarzı deneme",left,pageHeight-7);
    pdf.text(`${page} / ${pages}`,pageWidth-right,pageHeight-7,{align:"right"});
  }
  const arrayBuffer=pdf.output("arraybuffer");
  if(!arrayBuffer||arrayBuffer.byteLength<5000)throw new Error("PDF içeriği doğrulanamadı.");
  return {pdf,arrayBuffer,base64:arrayBufferToBase64(arrayBuffer),pages};
}
async function savePrintableExamPdf(title,questions){
  const filename=`2026-Gercek-Muzik-Sinavi-Tarzi-${questions.length}-Soru.pdf`;
  try{
    toast("Yazdırılabilir deneme hazırlanıyor…");
    const built=await buildPrintableExamPdf(title,questions),nativeSaver=window.Capacitor?.Plugins?.PdfSaver;
    const isAndroid=window.Capacitor?.getPlatform?.()==="android";
    if(isAndroid&&nativeSaver){
      const result=await nativeSaver.save({base64:built.base64,filename});
      toast(result?.saved?`Deneme ${built.pages} sayfa olarak kaydedildi.`:"PDF kaydetme iptal edildi.");
    }else{
      built.pdf.save(filename);toast(`Deneme ${built.pages} sayfa olarak indirildi. Dosyalar'dan Yazdır'ı seçebilirsin.`);
    }
  }catch(error){toast(`Deneme hazırlanamadı: ${error.message}`)}
}

function learningSourceItems(scope="all",limit=30){
  const subjectOk=x=>scope==="all"||x.subject===scope;
  const byQuestion=new Map();
  mistakeHistory().filter(subjectOk).forEach(item=>{
    const old=byQuestion.get(item.questionId);
    if(!old)byQuestion.set(item.questionId,{...item});
    else{
      old.count=(old.count||1)+(item.count||1);
      if(new Date(item.lastDate||item.date)>new Date(old.lastDate||old.date))Object.assign(old,{...item,count:old.count});
    }
  });
  const current=new Map(allQuestions().map(q=>[String(q.id),q]));
  let items=[...byQuestion.values()].sort((a,b)=>
    (b.count||1)-(a.count||1)||new Date(b.lastDate||b.date)-new Date(a.lastDate||a.date)
  ).map(x=>({...x,q:current.get(String(x.questionId))||{
    id:x.questionId,question:x.question,choices:x.choices,answer:x.answer,
    educationArea:x.subject==="education"?(x.area||"Eğitim Bilimleri"):undefined
  }}));
  if(!items.length){
    const fallbacks=[
      ...(scope!=="education"?savedWrongQuestions("wrongMusicQuestions").map(q=>({q,subject:"music",area:questionAreaLabel(q),count:1})):[]),
      ...(scope!=="music"?savedWrongQuestions("wrongEducationQuestions").map(q=>({q,subject:"education",area:questionAreaLabel(q),count:1})):[])
    ];
    items=fallbacks;
  }
  return items.slice(0,limit);
}
function scopeLabel(scope){
  return scope==="music"?"Müzik":scope==="education"?"Eğitim Bilimleri":"Müzik + Eğitim Bilimleri";
}
function renderPersonalWorkbook(){
  const latest=store.get("latestPersonalWorkbook",null);
  setTitle("Kişisel Çalışma Kitabı","Yanlışlarından yazdırılabilir kitapçık",true);
  app.innerHTML=`<section class="hero workbook-hero"><h2>Sana özel çalışma kitabı</h2><p>AI, gerçek yanlışlarını konu kümelerine ayırır; kısa ders notu, kavram karşılaştırması, yeni alıştırmalar ve en sonda ayrı cevap anahtarı hazırlar.</p></section>
  <div class="ai-control-grid"><div><label>İçerik alanı</label><select id="workbook-scope"><option value="all">Müzik + Eğitim Bilimleri</option><option value="music">Yalnız Müzik</option><option value="education">Yalnız Eğitim Bilimleri</option></select></div>
  <div><label>İncelenecek yanlış</label><select id="workbook-count"><option>10</option><option selected>20</option><option>30</option><option>40</option></select></div></div>
  <div class="workbook-options">
    <label class="check-row"><input id="workbook-summaries" type="checkbox" checked><span>Kısa konu anlatımları ve kavram karşılaştırmaları</span></label>
    <label class="check-row"><input id="workbook-similar" type="checkbox" checked><span>Benzer çoktan seçmeli alıştırmalar</span></label>
    <label class="check-row"><input id="workbook-fill" type="checkbox" checked><span>Boşluk doldurma ve kısa cevap etkinlikleri</span></label>
    <label class="check-row"><input id="workbook-writing" type="checkbox" checked><span>Kalemle yazılacak “Bunu kendi cümlenle yaz” alanları</span></label>
  </div>
  <div class="actions"><button class="primary" id="generate-workbook">📕 Çalışma Kitabımı Oluştur</button><button class="secondary" id="print-workbook" ${latest?.text?"":"disabled"}>🖨 PDF Olarak İndir / Yazdır</button></div>
  <div class="report-output ${latest?.text?"":"hidden"}" id="workbook-output">${latest?.text?esc(latest.text):""}</div>`;
  if(latest?.text)state.activeReport=latest;
  $("#generate-workbook").onclick=generatePersonalWorkbook;
  $("#print-workbook").onclick=()=>{const report=state.activeReport||latest;if(report?.text)printTextReport("Kişisel Çalışma Kitabım",report.text)};
}
async function generatePersonalWorkbook(){
  const scope=$("#workbook-scope").value,count=+$("#workbook-count").value;
  const items=learningSourceItems(scope,count),button=$("#generate-workbook"),output=$("#workbook-output"),print=$("#print-workbook");
  if(!items.length)return toast("Bu alanda henüz kayıtlı yanlış yok.");
  const options={
    summaries:$("#workbook-summaries").checked,similar:$("#workbook-similar").checked,
    fill:$("#workbook-fill").checked,writing:$("#workbook-writing").checked
  };
  const data=items.map(x=>({
    alan:x.area||questionAreaLabel(x.q),soru:x.q.question,
    secilen:x.selected&&x.q.choices?.[x.selected]?x.q.choices[x.selected]:"Bilinmiyor",
    dogru:x.q.choices?.[x.q.answer],aciklama:x.q.explanation||"",yanlisTekrari:x.count||1
  }));
  const sections=[
    options.summaries?"KISA KONU DERSLERİ ve KARIŞTIRILAN KAVRAMLAR":"KONU BAŞLIKLARI",
    options.writing?"KALEMLE YAZ – Her ana bilgi için öğrencinin kendi cümlesiyle tamamlayacağı çizgili alan bırak.":"KISA TEKRAR",
    options.similar?"PEKİŞTİRME TESTİ – Verilen doğrulanmış bilgilerden 10-15 özgün çoktan seçmeli soru üret.":"KONTROL SORULARI",
    options.fill?"BOŞLUK DOLDURMA ve KISA CEVAP ETKİNLİKLERİ":"HIZLI KONTROL",
    "CEVAP ANAHTARI – Bütün alıştırmaların cevaplarını yalnız en sonda ver."
  ].join("\n");
  const prompt=`Aşağıdaki gerçek yanlış kayıtlarından ${scopeLabel(scope)} alanında kişisel bir çalışma kitabı hazırla:
${JSON.stringify(data)}

Bu çıktı A4 kâğıda basılıp kalemle çalışılacak. Deneyimli bir öğretmenin öğrenciye özel hazırladığı gibi seçici, doğal ve düzenli olsun. Soruları tek tek kopyalamak yerine ortak eksikleri öğret. Yalnız verilen doğru cevaplar ve açıklamalardan kesin çıkarılabilen bilgileri kullan; doğrulanmamış ayrıntı uydurma.

Kitabın sırası:
ÖĞRETMENDEN KISA NOT
${sections}

Başlıkları büyük harfle yaz. Yazma alanlarında üç satır "........................................................................" kullan. Cevapları etkinliklerin yanında gösterme. Türkçe, yaklaşık 1600-2300 kelime yaz.`;
  output.classList.remove("hidden");output.textContent="Yanlışlar konu kümelerine ayrılıyor ve kitapçık hazırlanıyor…";
  button.disabled=true;button.textContent="Kitabın hazırlanıyor…";
  try{
    const text=await openAIText(prompt,"Sen müzik öğretmenliği ve Eğitim Bilimleri sınavlarında deneyimli bir öğretmen ve çalışma föyü yazarı­sın. Verilen yanlışlardan A4'e uygun, doğru, sade ve gerçekten öğretici kişisel çalışma kitabı hazırla.",{maxOutputTokens:4800});
    const report={text,date:new Date().toISOString(),count:items.length,scope};
    store.set("latestPersonalWorkbook",report);state.activeReport=report;
    output.textContent=text;print.disabled=false;button.textContent="↻ Kitabı Yeniden Oluştur";
    print.onclick=()=>printTextReport("Kişisel Çalışma Kitabım",text);
  }catch(error){output.textContent=`Hata: ${error.message}`;button.textContent="↻ Yeniden Dene"}
  finally{button.disabled=false}
}

function renderWrongVoiceLesson(){
  const saved=store.get("latestWrongVoiceLesson",null);
  setTitle("Yanlışlardan Sesli Ders","Dinle · durdur · kalemle yaz",true);
  app.innerHTML=`<section class="hero voice-lesson-hero"><h2>Not aldıran kişisel sesli ders</h2><p>Yanlışların öğretmen anlatımı hâline gelir. Ders kısa bölümlere ayrılır; “yazma molası” geldiğinde otomatik durur. Notunu yazdıktan sonra devam edersin.</p></section>
  <div class="ai-control-grid"><div><label>Ders alanı</label><select id="voice-lesson-scope"><option value="all">Müzik + Eğitim Bilimleri</option><option value="music">Yalnız Müzik</option><option value="education">Yalnız Eğitim Bilimleri</option></select></div>
  <div><label>Ders uzunluğu</label><select id="voice-lesson-length"><option value="short">5 dakika</option><option value="medium" selected>8–10 dakika</option><option value="long">12–15 dakika</option></select></div></div>
  <label>Konuşma hızı: <b id="voice-rate-label">0.85×</b></label><input id="voice-rate" class="voice-rate" type="range" min="0.60" max="1.35" step="0.05" value="${store.get("wrongVoiceRate",.85)}">
  <label class="check-row voice-pause-option"><input id="voice-auto-pause" type="checkbox" ${store.get("wrongVoiceAutoPause",true)?"checked":""}><span>“Yazma molası”ndan sonra otomatik dur</span></label>
  <div class="actions"><button class="primary" id="generate-voice-lesson">🎧 Sesli Dersimi Hazırla</button></div>
  <div class="voice-lesson-controls ${saved?.text?"":"hidden"}" id="voice-lesson-controls">
    <button class="primary" id="play-voice-lesson">▶ Baştan Oynat</button>
    <button class="secondary" id="pause-voice-lesson">Ⅱ Duraklat</button>
    <button class="secondary" id="continue-voice-lesson">▶ Devam Et</button>
    <button class="danger" id="stop-voice-lesson">■ Durdur</button>
    <button class="secondary hidden" id="voice-engine-settings">⚙ Ses Ayarları</button>
  </div>
  <div class="voice-progress ${saved?.text?"":"hidden"}" id="voice-progress"><i></i><span>Hazır</span></div>
  <div class="lesson-transcript ${saved?.text?"":"hidden"}" id="voice-lesson-output">${saved?.text?lessonTranscriptHtml(saved.text):""}</div>`;
  const rate=$("#voice-rate");$("#voice-rate-label").textContent=`${(+rate.value).toFixed(2)}×`;
  rate.oninput=()=>{$("#voice-rate-label").textContent=`${(+rate.value).toFixed(2)}×`;store.set("wrongVoiceRate",+rate.value)};
  rate.onchange=()=>restartCurrentVoiceChunk();
  $("#voice-auto-pause").onchange=e=>store.set("wrongVoiceAutoPause",e.target.checked);
  $("#generate-voice-lesson").onclick=generateWrongVoiceLesson;
  const settingsButton=$("#voice-engine-settings");
  if(nativeTts()&&settingsButton){
    settingsButton.classList.remove("hidden");
    settingsButton.onclick=()=>nativeTts().openSettings();
  }
  mountWrongVoiceControls(saved?.text||"");
}
function lessonChunks(text){
  return String(text||"").split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).flatMap(paragraph=>{
    if(paragraph.length<=650)return [paragraph];
    const sentences=paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[paragraph],chunks=[];let current="";
    sentences.forEach(sentence=>{if((current+sentence).length>600&&current){chunks.push(current.trim());current=""}current+=sentence});
    if(current.trim())chunks.push(current.trim());return chunks;
  });
}
function lessonTranscriptHtml(text){
  return lessonChunks(text).map((x,i)=>`<section data-lesson-chunk="${i}" class="${/\[?YAZMA MOLASI\]?/i.test(x)?"writing-pause":""}"><small>${i+1}</small><p>${esc(x.replace(/\[|\]/g,""))}</p></section>`).join("");
}
function mountWrongVoiceControls(text){
  const play=$("#play-voice-lesson"),pause=$("#pause-voice-lesson"),cont=$("#continue-voice-lesson"),stop=$("#stop-voice-lesson");
  if(!play||!text)return;
  play.onclick=()=>startWrongVoiceLesson(text,0);
  pause.onclick=pauseWrongVoiceLesson;
  cont.onclick=continueWrongVoiceLesson;
  stop.onclick=()=>stopWrongVoiceLesson(true);
}
function nativeTts(){
  return window.Capacitor?.Plugins?.NativeTts||null;
}
function canUseVoiceEngine(){
  return !!nativeTts()||("speechSynthesis" in window&&typeof window.SpeechSynthesisUtterance==="function");
}
async function cancelVoiceEngine(){
  if(state.questionAudio){
    state.questionAudio.pause();
    state.questionAudio.currentTime=0;
    state.questionAudio=null;
  }
  const native=nativeTts();
  if(native){
    try{await native.stop()}catch(_){}
    return;
  }
  if("speechSynthesis" in window)window.speechSynthesis.cancel();
}
function speakVoiceText(text,rate){
  const native=nativeTts();
  if(native)return native.speak({text,rate});
  return new Promise((resolve,reject)=>{
    if(!canUseVoiceEngine())return reject(new Error("Bu cihazın sesli okuma motoru kullanılamıyor."));
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.lang="tr-TR";utterance.rate=rate;utterance.pitch=1;
    utterance.onend=()=>resolve({stopped:false});
    utterance.onerror=e=>{
      if(e.error==="canceled"||e.error==="interrupted")resolve({stopped:true});
      else reject(new Error("Sesli okuma durdu."));
    };
    window.speechSynthesis.speak(utterance);
  });
}
function questionVoiceButtonHtml(){
  const rate=+store.get("questionVoiceRate",1);
  return `<div class="question-voice-panel">
    <div class="question-voice-actions"><button class="secondary question-voice-button" id="question-voice" type="button">🔊 AI Kadın Sesiyle Oku</button></div>
    <label class="question-voice-rate"><span>Okuma hızı <b id="question-voice-rate-label">${rate.toFixed(2)}×</b></span><input id="question-voice-rate" type="range" min="0.65" max="1.40" step="0.05" value="${rate}"></label>
    <small>Ses AI tarafından üretilir; yalnızca soru metni okunur.</small>
  </div>`;
}
function questionVoiceText(q){
  return `Soru. ${q?.question||""}.`.replace(/\s+/g," ").trim();
}
function mountQuestionVoice(q){
  const button=$("#question-voice"),rateInput=$("#question-voice-rate"),rateLabel=$("#question-voice-rate-label");
  if(!button)return;
  rateInput.oninput=()=>{
    const rate=+rateInput.value;
    rateLabel.textContent=`${rate.toFixed(2)}×`;
    store.set("questionVoiceRate",rate);
    if(state.questionAudio)state.questionAudio.playbackRate=rate;
  };
  button.onclick=async()=>{
    button.disabled=true;
    button.textContent="⏳ AI sesi hazırlanıyor…";
    try{
      await cancelVoiceEngine();
      await speakQuestionWithAI(questionVoiceText(q),+rateInput.value);
    }catch(error){
      toast(error?.message||"Soru sesli okunamadı.");
    }finally{
      const current=$("#question-voice");
      if(current){current.disabled=false;current.textContent="🔊 AI Kadın Sesiyle Oku"}
    }
  };
}
async function speakQuestionWithAI(text,rate=1){
  const key=store.get("apiKey","");
  if(!key)throw new Error("AI sesi için önce Ayarlar bölümüne OpenAI API anahtarını gir.");
  let url=state.questionVoiceCache.get(text);
  if(!url){
    const response=await fetch("https://api.openai.com/v1/audio/speech",{
      method:"POST",
      headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({
        model:"gpt-4o-mini-tts",
        voice:"coral",
        input:text,
        instructions:"Türkçe konuşan doğal, sıcak ve anlaşılır bir kadın eğitimci sesiyle oku. Sınav sorusunu sakin ve net tonla seslendir."
      })
    });
    if(!response.ok){
      let message=`HTTP ${response.status}`;
      try{message=(await response.json()).error?.message||message}catch(_){}
      throw new Error(message);
    }
    url=URL.createObjectURL(await response.blob());
    state.questionVoiceCache.set(text,url);
    if(state.questionVoiceCache.size>20){
      const oldest=state.questionVoiceCache.keys().next().value;
      URL.revokeObjectURL(state.questionVoiceCache.get(oldest));
      state.questionVoiceCache.delete(oldest);
    }
  }
  const audio=new Audio(url);
  audio.playbackRate=rate;
  audio.preservesPitch=true;
  state.questionAudio=audio;
  return new Promise((resolve,reject)=>{
    audio.onended=()=>{if(state.questionAudio===audio)state.questionAudio=null;resolve({stopped:false})};
    audio.onerror=()=>{if(state.questionAudio===audio)state.questionAudio=null;reject(new Error("AI ses dosyası oynatılamadı."))};
    audio.play().catch(error=>reject(new Error(error?.message||"Ses başlatılamadı.")));
  });
}
async function startWrongVoiceLesson(text,startIndex=0){
  if(!canUseVoiceEngine())return toast("Bu cihazın sesli okuma motoru kullanılamıyor.");
  if(state.voiceLesson){
    state.voiceLesson.playing=false;
    state.voiceLesson.generation=(state.voiceLesson.generation||0)+1;
  }
  await cancelVoiceEngine();
  state.voiceLesson={text,chunks:lessonChunks(text),index:startIndex,playing:true,paused:false,generation:0};
  speakWrongVoiceChunk();
}
async function speakWrongVoiceChunk(){
  const lesson=state.voiceLesson;if(!lesson?.playing||lesson.paused)return;
  if(lesson.index>=lesson.chunks.length){stopWrongVoiceLesson(true,"Ders tamamlandı");return}
  document.querySelectorAll("[data-lesson-chunk]").forEach(x=>x.classList.toggle("active",+x.dataset.lessonChunk===lesson.index));
  const progress=$("#voice-progress"),pct=Math.round(lesson.index/lesson.chunks.length*100);
  if(progress){progress.classList.remove("hidden");progress.querySelector("i").style.width=`${pct}%`;progress.querySelector("span").textContent=`Bölüm ${lesson.index+1} / ${lesson.chunks.length}`}
  const generation=++lesson.generation;
  const chunkIndex=lesson.index;
  try{
    const result=await speakVoiceText(
      lesson.chunks[chunkIndex].replace(/\[|\]/g,""),
      +($("#voice-rate")?.value||store.get("wrongVoiceRate",.85))
    );
    if(state.voiceLesson!==lesson||!lesson.playing||lesson.paused||lesson.generation!==generation||result?.stopped)return;
    const wasWritingPause=/\[?YAZMA MOLASI\]?/i.test(lesson.chunks[chunkIndex]);
    lesson.index++;
    if(wasWritingPause&&($("#voice-auto-pause")?.checked??true)){
      lesson.paused=true;
      const p=$("#voice-progress");if(p)p.querySelector("span").textContent="Kalemle yazma molası · Hazır olunca Devam Et";
      toast("Yazma molası");
      return;
    }
    speakWrongVoiceChunk();
  }catch(error){
    if(state.voiceLesson!==lesson||lesson.generation!==generation)return;
    lesson.playing=false;
    const message=String(error?.message||error||"Sesli okuma durdu.");
    toast(message.includes("Türkçe ses verisi")?"Türkçe ses verisi kurulu değil. Telefonun Sesli Okuma ayarlarından Türkçe sesi indir.":message);
  }
}
function pauseWrongVoiceLesson(){
  if(!state.voiceLesson?.playing)return;
  state.voiceLesson.paused=true;state.voiceLesson.generation++;cancelVoiceEngine();
  const p=$("#voice-progress");if(p)p.querySelector("span").textContent="Duraklatıldı";
}
function continueWrongVoiceLesson(){
  if(!state.voiceLesson?.playing){
    const saved=store.get("latestWrongVoiceLesson",null);if(saved?.text)startWrongVoiceLesson(saved.text,0);
    return;
  }
  state.voiceLesson.paused=false;restartCurrentVoiceChunk();
}
async function restartCurrentVoiceChunk(){
  const lesson=state.voiceLesson;
  if(!lesson?.playing||lesson.paused)return;
  lesson.generation++;
  await cancelVoiceEngine();
  if(state.voiceLesson===lesson&&lesson.playing&&!lesson.paused)speakWrongVoiceChunk();
}
function stopWrongVoiceLesson(update=true,label="Durduruldu"){
  if(state.voiceLesson){
    state.voiceLesson.playing=false;
    state.voiceLesson.generation=(state.voiceLesson.generation||0)+1;
  }
  cancelVoiceEngine();
  state.voiceLesson=null;
  if(update){
    document.querySelectorAll("[data-lesson-chunk]").forEach(x=>x.classList.remove("active"));
    const p=$("#voice-progress");if(p){p.querySelector("i").style.width="0%";p.querySelector("span").textContent=label}
  }
}
async function generateWrongVoiceLesson(){
  const scope=$("#voice-lesson-scope").value,length=$("#voice-lesson-length").value;
  const limits={short:12,medium:22,long:35},words={short:"650-850",medium:"1100-1400",long:"1600-2000"};
  const items=learningSourceItems(scope,limits[length]),button=$("#generate-voice-lesson"),output=$("#voice-lesson-output");
  if(!items.length)return toast("Bu alanda henüz kayıtlı yanlış yok.");
  const data=items.map(x=>({
    alan:x.area||questionAreaLabel(x.q),soru:x.q.question,
    secilen:x.selected&&x.q.choices?.[x.selected]?x.q.choices[x.selected]:"Bilinmiyor",
    dogru:x.q.choices?.[x.q.answer],aciklama:x.q.explanation||"",tekrar:x.count||1
  }));
  output.classList.remove("hidden");output.textContent="Yanlışların konuşma dersine dönüştürülüyor…";
  button.disabled=true;button.textContent="Ders hazırlanıyor…";stopWrongVoiceLesson(false);
  const prompt=`Aşağıdaki gerçek yanlışlardan ${scopeLabel(scope)} alanında, dinlerken kalemle not alınacak kişisel bir sesli ders metni hazırla:
${JSON.stringify(data)}

Bir öğretmenin öğrencisinin yanlış kâğıdına bakarak yüz yüze ders anlatması gibi doğal konuş. Sadece doğru cevabı sıralama: temel bilgiyi açıkla, seçilen çeldiriciyle farkını göster, kısa örnek veya hafıza bağlantısı kur. Veride olmayan kesin ayrıntıları uydurma.

Kurallar:
- ${words[length]} kelime.
- 4-7 kısa ders bölümü kullan.
- Her bölümde önce "BÖLÜM: ..." başlığı olsun.
- Cümleler yavaş dinlemeye ve yazmaya uygun, kısa ve açık olsun.
- Her önemli bölümün ardından ayrı paragraf olarak "[YAZMA MOLASI] Şimdi şu üç net bilgiyi defterine yaz: ..." de ve yazılacak maddeleri söyle.
- Sonunda "DERS SONU HIZLI TEKRAR" yap.
- Markdown tablosu kullanma; sesli okunacak temiz Türkçe yaz.`;
  try{
    const text=await openAIText(prompt,"Sen sabırlı, anlaşılır ve sınav odaklı bir özel ders öğretmenisin. Öğrencinin kalemle not alabilmesi için konuşma temposuna uygun, durakları belirgin kişisel ders metni yaz.",{maxOutputTokens:length==="long"?4200:3000});
    const saved={text,date:new Date().toISOString(),count:items.length,scope};
    store.set("latestWrongVoiceLesson",saved);
    output.innerHTML=lessonTranscriptHtml(text);
    $("#voice-lesson-controls").classList.remove("hidden");$("#voice-progress").classList.remove("hidden");
    mountWrongVoiceControls(text);button.textContent="↻ Sesli Dersi Yeniden Hazırla";
  }catch(error){output.textContent=`Hata: ${error.message}`;button.textContent="↻ Yeniden Dene"}
  finally{button.disabled=false}
}

function forgettingRiskEntries(){
  const history=store.get("answerHistory",[]).filter(x=>x?.questionId&&x?.date);
  const groups=new Map();
  history.forEach(x=>{const key=String(x.questionId);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x)});
  const current=new Map(allQuestions().map(q=>[String(q.id),q])),now=Date.now();
  const intervals=[.25,1,3,7,14,30,60];
  return [...groups.entries()].map(([id,attempts])=>{
    attempts.sort((a,b)=>new Date(b.date)-new Date(a.date));
    let streak=0;for(const x of attempts){if(!x.ok)break;streak++}
    const last=attempts[0],lastMs=new Date(last.date).getTime(),days=Math.max(0,(now-lastMs)/86400000);
    const interval=intervals[Math.min(streak,intervals.length-1)];
    const wrongRate=attempts.filter(x=>!x.ok).length/attempts.length;
    const risk=Math.max(0,Math.min(100,Math.round((days/interval)*82+wrongRate*18+(last.ok?0:28))));
    const q=current.get(id)||{id,question:last.question,choices:last.choices,answer:last.answer,educationArea:last.subject==="education"?(last.area||"Eğitim Bilimleri"):undefined};
    return {id,q,attempts:attempts.length,streak,days,interval,risk,lastOk:last.ok,area:last.area||questionAreaLabel(q),dueIn:interval-days};
  }).filter(x=>x.q?.question&&x.q?.choices&&x.q?.answer).sort((a,b)=>b.risk-a.risk||b.attempts-a.attempts);
}
function riskLabel(x){
  if(x.risk>=85)return ["Yüksek","high"];
  if(x.risk>=55)return ["Yaklaşıyor","medium"];
  return ["Düşük","low"];
}
function dueText(x){
  if(x.dueIn<=0)return `${Math.max(0,Math.floor(-x.dueIn))} gün gecikti`;
  if(x.dueIn<1)return "Bugün tekrar edilmeli";
  return `${Math.ceil(x.dueIn)} gün sonra`;
}
function renderForgettingRisk(){
  const entries=forgettingRiskEntries(),high=entries.filter(x=>x.risk>=85),medium=entries.filter(x=>x.risk>=55&&x.risk<85);
  setTitle("Unutma Riski Sistemi","Aralıklı tekrar radarı",true);
  app.innerHTML=`<section class="hero forgetting-hero"><h2>Bugün Hatırlaman Gerekenler</h2><p>Her bilgi için son görülme zamanı, doğru serisi ve geçmiş yanlışlar birlikte değerlendirilir. Tekrar yaptıkça bir sonraki hatırlatma aralığı otomatik uzar.</p>
  <div class="risk-summary"><article><b>${high.length}</b><span>Bugün</span></article><article><b>${medium.length}</b><span>Yaklaşıyor</span></article><article><b>${entries.length}</b><span>Takipte</span></article></div>
  <div class="actions"><button class="primary" id="review-risk" ${entries.length?"":"disabled"}>⏳ En Riskli 10 Bilgiyi Tekrar Et</button><button class="secondary" id="review-risk-20" ${entries.length?"":"disabled"}>İlk 20’yi Çöz</button></div></section>
  ${entries.length?`<div class="risk-list">${entries.slice(0,40).map((x,i)=>{const [label,klass]=riskLabel(x);return `<article class="risk-card ${klass}"><div class="risk-card-head"><span>${i+1}. ${esc(x.area)}</span><b>%${x.risk} · ${label}</b></div><p>${esc(x.q.question)}</p><div class="risk-meter"><i style="width:${x.risk}%"></i></div><small>${dueText(x)} · Son doğru serisi: ${x.streak} · ${x.attempts} çözüm kaydı</small></article>`}).join("")}</div>`:`<section class="hero"><h2>Henüz yeterli veri yok</h2><p>Test çözdükçe uygulama her bilginin unutma riskini hesaplayacak. İlk çözümden sonra bu ekran otomatik dolmaya başlar.</p></section>`}`;
  if(entries.length){
    $("#review-risk").onclick=()=>startExam(entries.slice(0,10).map(x=>x.q),"Bugün Hatırlaman Gerekenler");
    $("#review-risk-20").onclick=()=>startExam(entries.slice(0,20).map(x=>x.q),"Unutma Riski Tekrarı");
  }
}

function aiQuestionSolutionHtml(){
  return `<div class="ai-question-actions"><button class="secondary ai-question-button" id="ai-question-button" aria-expanded="false">🤖 AI ile Çözümü Açıkla</button></div>
  <div class="ai-question-box hidden" id="ai-question-box" aria-live="polite"><b>AI Soru Çözümü</b><div id="ai-question-content"></div></div>`;
}
function aiQuestionPrompt(q,selectedAnswer=""){
  const choices=Object.entries(q.choices||{}).map(([key,value])=>`${key}) ${value}`).join("\n");
  const area=isEducationQuestion(q)?`Eğitim Bilimleri${q.educationArea?` / ${q.educationArea}`:""}`:"Müzik";
  const sourceExplanation=q.explanation?.trim()?`\nKaynakta bulunan açıklama:\n${q.explanation.trim()}`:"";
  const selected=selectedAnswer?`\nKullanıcının işaretlediği seçenek: ${selectedAnswer}) ${q.choices[selectedAnswer]||""}`:"";
  return `Aşağıdaki çoktan seçmeli sınav sorusunu Türkçe, açık ve öğretici biçimde çöz.
Alan: ${area}
Soru: ${q.question}
Seçenekler:
${choices}
Doğru cevap anahtarı: ${q.answer}) ${q.choices[q.answer]}${selected}${sourceExplanation}

Şu sırayı kullan:
1. Doğru cevabı ve neden doğru olduğunu açıkla.
2. Diğer seçeneklerin her birinin neden yanlış olduğunu kısaca belirt.
3. Bir cümlelik hafıza ipucu ver.

Yanıtı 220 kelimeyi geçirmeden sade tut. Soru veya cevap anahtarı hatalı ya da tartışmalı görünüyorsa bunu açıkça belirt; yeni soru üretme.`;
}
function mountAiQuestionSolution(q,options={}){
  const button=$("#ai-question-button"),box=$("#ai-question-box"),content=$("#ai-question-content");
  if(!button||!box||!content)return;
  const cacheKey=`${q.id||q.question}|${q.answer}`,cached=state.aiQuestionExplanations[cacheKey];
  if(cached)content.textContent=cached;
  button.onclick=async()=>{
    const opening=box.classList.contains("hidden");
    if(!opening){
      box.classList.add("hidden");button.setAttribute("aria-expanded","false");button.textContent="🤖 AI ile Çözümü Açıkla";return;
    }
    const shouldWarn=options.simulation||Boolean(options.warnBeforeReveal?.());
    if(shouldWarn&&!state.aiQuestionExplanations[cacheKey]&&!confirm(options.simulation
      ?"AI çözümü doğru cevabı gösterecek. Gerçek sınav simülasyonunda devam etmek istiyor musun?"
      :"AI çözümü doğru cevabı gösterecek. Devam etmek istiyor musun?"))return;
    box.classList.remove("hidden");button.setAttribute("aria-expanded","true");
    if(state.aiQuestionExplanations[cacheKey]){
      content.textContent=state.aiQuestionExplanations[cacheKey];button.textContent="🤖 AI Çözümünü Gizle";return;
    }
    button.disabled=true;button.textContent="AI açıklıyor…";content.innerHTML='<span class="ai-question-loading">Çözüm hazırlanıyor…</span>';
    try{
      const selectedAnswer=typeof options.selectedAnswer==="function"?options.selectedAnswer():"";
      const answer=await openAIText(
        aiQuestionPrompt(q,selectedAnswer),
        "Sen müzik ve Eğitim Bilimleri alanlarında uzman bir sınav öğretmenisin. Verilen soruyu ve seçenekleri esas al; doğru cevabı gerekçelendir, çeldiricileri tek tek açıkla ve kısa bir hafıza ipucu ver. Türkçe, net ve bilgi odaklı yaz.",
        {maxOutputTokens:700}
      );
      state.aiQuestionExplanations[cacheKey]=answer;content.textContent=answer;button.textContent="🤖 AI Çözümünü Gizle";
    }catch(error){
      content.innerHTML=`<span class="ai-question-error">${esc(error.message)}</span>`;button.textContent="↻ AI Çözümünü Yeniden Dene";
    }finally{button.disabled=false}
  };
}
function similarQuestionHtml(){
  return `<div class="similar-question-actions"><button class="secondary similar-question-button" id="similar-question-button" aria-expanded="false">✨ Benzer Soru Üret</button></div>
  <div class="similar-question-box hidden" id="similar-question-box" aria-live="polite"><b>AI Benzer Soru</b><div id="similar-question-content"></div></div>`;
}
function similarQuestionPrompt(q){
  const choices=Object.entries(q.choices||{}).map(([key,value])=>`${key}) ${value}`).join("\n");
  const area=isEducationQuestion(q)?`Eğitim Bilimleri / ${q.educationArea||"Genel"}`:"Müzik";
  const choiceCount=Math.max(4,Object.keys(q.choices||{}).length);
  return `Aşağıdaki soruyla aynı bilgi veya kazanımı ölçen, fakat soru kökü ve seçenekleri farklı olan yalnızca bir özgün çoktan seçmeli soru üret.
Alan: ${area}
Örnek soru: ${q.question}
Örnek seçenekler:
${choices}
Örnek sorunun doğru cevabı: ${q.answer}) ${q.choices[q.answer]}

Kurallar:
- KPSS veya KKTC öğretmenlik sınavı düzeyinde, kısa ve anlaşılır Türkçe kullan.
- Soru, örnekteki aynı temel kavramı ölçsün; örnek soruyu kopyalamasın.
- Tam ${choiceCount} seçenek olsun ve seçenek harfleri A'dan başlayarak sıralansın.
- Tek ve tartışmasız bir doğru cevap bulunsun.
- Yanlış seçenekler doğru cevapla aynı kavram ailesinden, gerçekçi ve güçlü çeldiriciler olsun.
- Eğitim Bilimlerinde Eğitim Felsefesi ve Eğitim Sosyolojisine geçme.
- Müzik sorularında eser-besteci, dönem-dönem, terim-terim gibi aynı tür eşleşmeyi koru.
- Yalnızca geçerli JSON döndür; kod bloğu veya ek metin yazma.

Şema:
{"question":"...","choices":{"A":"...","B":"...","C":"...","D":"..."${choiceCount===5?',"E":"..."':""}},"answer":"A","explanation":"Doğru cevabın neden doğru olduğunu kısa ve öğretici biçimde açıkla."}`;
}
function parseSimilarQuestion(raw){
  const clean=String(raw||"").replace(/^```(?:json)?\s*/i,"").replace(/```\s*$/,"").trim();
  const start=clean.indexOf("{"),end=clean.lastIndexOf("}");
  if(start<0||end<start)throw new Error("AI geçerli soru biçimi döndürmedi.");
  const parsed=JSON.parse(clean.slice(start,end+1)),keys=Object.keys(parsed.choices||{});
  if(!parsed.question||keys.length<4||!parsed.answer||!parsed.choices[parsed.answer])throw new Error("AI sorusu eksik oluşturuldu.");
  return {question:String(parsed.question),choices:parsed.choices,answer:String(parsed.answer),explanation:String(parsed.explanation||"")};
}
function renderSimilarQuestionContent(generated){
  const content=$("#similar-question-content");
  if(!content)return;
  content.innerHTML=`<div class="similar-question-text">${esc(generated.question)}</div>
  <div class="similar-choices">${Object.entries(generated.choices).map(([key,value])=>`<button class="choice similar-choice" data-similar-key="${esc(key)}"><strong>${esc(key)}</strong><span>${esc(value)}</span></button>`).join("")}</div>
  <div class="similar-feedback" id="similar-feedback"></div>
  <button class="secondary similar-regenerate" id="similar-regenerate">↻ Başka Benzer Soru Üret</button>`;
  document.querySelectorAll(".similar-choice").forEach(button=>button.onclick=()=>{
    const selected=button.dataset.similarKey,ok=selected===generated.answer;
    document.querySelectorAll(".similar-choice").forEach(choice=>{
      choice.disabled=true;
      if(choice.dataset.similarKey===generated.answer)choice.classList.add("correct");
      else if(choice.dataset.similarKey===selected)choice.classList.add("wrong");
    });
    $("#similar-feedback").innerHTML=`<div class="result"><b>${ok?"Doğru!":"Yanlış."}</b><br>Doğru cevap: ${esc(generated.answer)}) ${esc(generated.choices[generated.answer])}${generated.explanation?`<br><br>${esc(generated.explanation)}`:""}</div>`;
  });
}
function mountSimilarQuestion(q){
  const button=$("#similar-question-button"),box=$("#similar-question-box"),content=$("#similar-question-content");
  if(!button||!box||!content)return;
  const cacheKey=questionStateKey(q);
  const generate=async(force=false)=>{
    box.classList.remove("hidden");button.setAttribute("aria-expanded","true");
    if(!force&&state.aiSimilarQuestions[cacheKey]){
      renderSimilarQuestionContent(state.aiSimilarQuestions[cacheKey]);
      button.textContent="✨ Benzer Soruyu Gizle";
      $("#similar-regenerate").onclick=()=>generate(true);
      return;
    }
    button.disabled=true;button.textContent="Benzer soru hazırlanıyor…";
    content.innerHTML='<span class="similar-question-loading">Yeni soru hazırlanıyor…</span>';
    try{
      const raw=await openAIText(
        similarQuestionPrompt(q),
        "Sen müzik ve Eğitim Bilimleri alanlarında uzman bir sınav öğretmenisin. Verilen kazanımı ölçen, özgün, kısa ve temiz bir Türkçe test sorusu üret. Çeldiriciler aynı bilgi ailesinden olsun. Yalnızca istenen JSON'u döndür.",
        {maxOutputTokens:650}
      );
      const generated=parseSimilarQuestion(raw);
      state.aiSimilarQuestions[cacheKey]=generated;
      renderSimilarQuestionContent(generated);
      $("#similar-regenerate").onclick=()=>generate(true);
      button.textContent="✨ Benzer Soruyu Gizle";
    }catch(error){
      content.innerHTML=`<span class="similar-question-error">${esc(error.message)}</span>`;
      button.textContent="↻ Benzer Soruyu Yeniden Dene";
    }finally{button.disabled=false}
  };
  button.onclick=()=>{
    if(!box.classList.contains("hidden")){
      box.classList.add("hidden");button.setAttribute("aria-expanded","false");button.textContent="✨ Benzer Soru Üret";return;
    }
    generate(false);
  };
}
async function openAIWebText(input,instructions="",options={}){
  const key=store.get("apiKey","");if(!key)throw new Error("Önce Ayarlar bölümüne API anahtarını gir.");
  const model=options.model||store.get("aiModel","gpt-4.1-mini"),body={model,instructions,input,max_output_tokens:options.maxOutputTokens||2400},webEnabled=options.webSearch!==false;
  if(webEnabled){body.tools=[{type:"web_search"}];if(options.requireWebSearch)body.tool_choice="required"}
  if(options.jsonSchema)body.text={format:{type:"json_schema",name:options.schemaName||"structured_response",strict:true,schema:options.jsonSchema}};
  if(/^gpt-5/.test(model))body.reasoning={effort:options.reasoningEffort||(webEnabled?"low":"minimal")};
  const response=await requestOpenAIResponse(body,key,{timeoutMs:options.timeoutMs||(webEnabled?120000:60000),networkAttempts:options.networkAttempts||(webEnabled?2:1)});return responseOutputText(response);
}
function parseJsonResponse(text){
  const clean=String(text).replace(/```json|```/gi,"").trim(),start=clean.indexOf("{"),end=clean.lastIndexOf("}");
  if(start<0||end<start)throw new Error("AI geçerli soru verisi döndürmedi.");
  try{return JSON.parse(clean.slice(start,end+1))}catch{throw new Error("AI soru verisini eksik döndürdü.")}
}
function musicQuestionSchema(count){
  const sourceSchema={type:"object",additionalProperties:false,properties:{name:{type:"string"},url:{type:"string"}},required:["name","url"]};
  const questionSchema={type:"object",additionalProperties:false,properties:{question:{type:"string"},choices:{type:"object",additionalProperties:false,properties:{A:{type:"string"},B:{type:"string"},C:{type:"string"},D:{type:"string"}},required:["A","B","C","D"]},answer:{type:"string",enum:["A","B","C","D"]},explanation:{type:"string"},infoSources:{type:"array",items:sourceSchema,minItems:1,maxItems:3}},required:["question","choices","answer","explanation","infoSources"]};
  return {type:"object",additionalProperties:false,properties:{questions:{type:"array",items:questionSchema,minItems:count,maxItems:count}},required:["questions"]};
}
const MUSIC_AI_AREAS=[
  "Tüm Müzik Alanları",
  "İlk Çağ ve Antik Dönem Müziği",
  "Orta Çağ Müziği",
  "Rönesans Dönemi Müziği",
  "Barok Dönem Müziği",
  "Rokoko ve Klasik Döneme Geçiş",
  "Klasik Dönem Müziği",
  "Romantik Dönem Müziği",
  "20. Yüzyıl ve Çağdaş Müzik",
  "Türk Müziği Tarihi",
  "Geleneksel Türk Sanat Müziği",
  "Türk Halk Müziği",
  "Cumhuriyet Dönemi Türk Müziği ve Bestecileri",
  "Çalgı Bilgisi ve Orkestrasyon",
  "Müzik Teorisi, Armoni ve Akorlar",
  "Müzik Biçimleri ve Türleri",
  "Opera, Bale ve Sahne Müziği",
  "Müzik Terimleri ve Gösterim",
  "Müzik Eğitimi Yöntemleri"
];
const KHK_2025_BLUEPRINT=[
  {area:"Müzik kuramı, armoni, diziler, akorlar, notasyon, prozodi ve artikülasyon",weight:16},
  {area:"Müzik tarihi, dönemler, besteciler, eserler, türler ve biçimler",weight:16},
  {area:"Çalgı bilgisi, orkestrasyon, çalgı aileleri ve oda müziği toplulukları",weight:10},
  {area:"Türk sanat müziği, Türk halk müziği, makam-usul ve Cumhuriyet dönemi",weight:10},
  {area:"Müzik eğitimi yöntemleri, çocuk şarkıları ve öğretim uygulamaları",weight:7},
  {area:"Opera, bale, konçerto ve sahne müziği",weight:7},
  {area:"Kıbrıs Türk müzik kültürü, kurumları, türküleri ve yerel kaynaklar",weight:4}
];
function khk2025Schema(count){
  const question={type:"object",additionalProperties:false,properties:{question:{type:"string"},choices:{type:"object",additionalProperties:false,properties:{A:{type:"string"},B:{type:"string"},C:{type:"string"},D:{type:"string"},E:{type:"string"}},required:["A","B","C","D","E"]},answer:{type:"string",enum:["A","B","C","D","E"]},explanation:{type:"string"},topic:{type:"string"},difficulty:{type:"string",enum:["Kolay","Orta","Zor"]}},required:["question","choices","answer","explanation","topic","difficulty"]};
  return {type:"object",additionalProperties:false,properties:{questions:{type:"array",items:question,minItems:count,maxItems:count}},required:["questions"]};
}
function scaledKhkBlueprint(total){
  const raw=KHK_2025_BLUEPRINT.map(x=>({...x,count:Math.floor(total*x.weight/70)}));
  let left=total-raw.reduce((n,x)=>n+x.count,0),i=0;
  while(left-->0)raw[i++%raw.length].count++;
  return raw.filter(x=>x.count>0);
}
function renderKhkMusic2025Generator(){
  const saved=+store.get("khk2025Count",70);
  setTitle("2025 Müzik Alanı Tarzı Deneme","KHK 2025 sınav profili",true);
  app.innerHTML=`<section class="hero khk-2025-hero"><h2>2025 Müzik Öğretmenliği Alan Sınavı Tarzı</h2><p>Yüklediğin 70 soruluk 2025 çalışma sınavının konu dağılımı, kök uzunluğu, beş seçenekli yapısı, çeldirici seviyesi ve zorluk dengesi örnek alınarak yeni ve özgün sorular hazırlanır.</p></section>
  <div class="result"><b>Sınav profili:</b> %36 kolay · %46 orta · %18 zor. Kısa, orta ve uzun soru kökleri 2025 belgesindeki gibi karışık; bütün temel müzik alanları dengeli.</div>
  <label>Soru sayısı</label><select id="khk-2025-count">${[10,20,35,70].map(n=>`<option value="${n}" ${n===saved?"selected":""}>${n}${n===70?" · Tam deneme":""}</option>`).join("")}</select>
  <label class="check-row"><input type="checkbox" checked disabled><span>Her soru 5 seçenekli, tek doğru cevaplı ve 2025 sınav düzeyinde üretilecek</span></label>
  <div class="actions"><button class="primary" id="khk-2025-generate">Denemeyi Oluştur</button></div><div id="khk-2025-status"></div>`;
  $("#khk-2025-generate").onclick=generateKhkMusic2025Exam;
}
function khk2025Prompt(area,count,batchNo,totalBatches){
  return `2025 KKTC Kamu Hizmeti Komisyonu Müzik Öğretmenliği çalışma sorularının sınav profiline çok yakın, fakat metni ve cevapları özgün ${count} soru üret. Bu paket ${batchNo}/${totalBatches}. Alan: ${area}.

Referans sınavın değişmez özellikleri:
- Her soru A, B, C, D, E olmak üzere tam beş seçeneklidir.
- Sorular müzik öğretmenliği alan bilgisi ölçer; genel kültür veya Eğitim Bilimleri sorusuna dönüşmez.
- Köklerin yaklaşık %55'i kısa ve doğrudan, %35'i orta uzunlukta tanım/özellik/eşleştirme, %10'u öncüllü ya da yorum gerektiren uzundur.
- Güçlük dağılımı yaklaşık %36 kolay, %46 orta, %18 zordur. Çok uç, kaynaksız veya tartışmalı ayrıntı sorma.
- Soru türlerini karıştır: hangisidir/değildir, tanımdan kavram, eser-besteci, dönem-özellik, çalgı tekniği, dizi-akor çözümleme, yanlış eşleştirme ve yerel müzik bilgisi.
- Çeldiriciler doğru cevapla aynı türden, aynı döneme veya yakın kavram ailesine ait ve güçlü olsun. Bariz saçma şık kullanma.
- Aynı bilgiyi, aynı doğru cevabı veya aynı soru kalıbını paket içinde tekrar etme.
- Yazım dili ve soru uzunlukları resmî 2025 çalışma sınavı üslubunda olsun; referans soruların cümlelerini kopyalama.
- Her açıklama doğru cevabı 1-3 cümlede gerekçelendirsin. Cevap anahtarı ile açıklamayı mutlaka karşılaştır.

Yalnız yapılandırılmış JSON döndür.`;
}
async function generateKhkBatch(job,index,totalJobs){
  let lastError;
  for(let attempt=1;attempt<=2;attempt++)try{
    const text=await openAIWebText(khk2025Prompt(job.area,job.count,index+1,totalJobs),"Sen müzik öğretmenliği alan sınavları hazırlayan titiz bir akademik ölçme editörüsün. 2025 KHK profilini koru; özgün, doğru, beş seçenekli ve güçlü çeldiricili sorular yaz. Gerektiğinde web aramasıyla olguyu doğrula. Çıktıda yalnız istenen JSON olsun.",{maxOutputTokens:Math.max(2400,job.count*330),jsonSchema:khk2025Schema(job.count),schemaName:`khk_music_2025_${index+1}`});
    const parsed=parseJsonResponse(text);
    if(!Array.isArray(parsed.questions)||parsed.questions.length!==job.count)throw new Error("Paket eksik üretildi.");
    return parsed.questions.map((q,i)=>{
      const choices=q.choices||{},answer=String(q.answer||"").toUpperCase();
      if(!q.question||Object.keys(choices).length!==5||!choices[answer])throw new Error(`${i+1}. soru eksik.`);
      return {id:`khk2025_${Date.now()}_${index}_${i}`,question:String(q.question).trim(),choices,answer,explanation:String(q.explanation||"").trim(),area:`2025 Müzik Alanı Tarzı · ${q.topic||job.area}`,difficulty:q.difficulty,sourceLabel:"2025 KHK Müzik Öğretmenliği sınav profili"};
    });
  }catch(error){lastError=error}
  throw lastError||new Error("Soru paketi üretilemedi.");
}
async function generateKhkMusic2025Exam(){
  const count=+$("#khk-2025-count").value,status=$("#khk-2025-status"),button=$("#khk-2025-generate");
  store.set("khk2025Count",count);button.disabled=true;
  const jobs=[];scaledKhkBlueprint(count).forEach(group=>{let left=group.count;while(left>0){const size=Math.min(8,left);jobs.push({area:group.area,count:size});left-=size}});
  const results=new Array(jobs.length);let next=0,done=0;
  status.innerHTML=`<div class="result">2025 sınav profili uygulanıyor · 0/${count} soru</div>`;
  async function worker(){while(next<jobs.length){const index=next++;results[index]=await generateKhkBatch(jobs[index],index,jobs.length);done+=results[index].length;status.innerHTML=`<div class="result">Sorular hazırlanıyor ve denetleniyor · ${done}/${count}</div>`}}
  try{
    await Promise.all(Array.from({length:Math.min(3,jobs.length)},worker));
    const questions=results.flat();
    if(questions.length!==count)throw new Error(`${count} sorunun tamamı üretilemedi.`);
    const normalized=new Set(questions.map(q=>q.question.toLocaleLowerCase("tr-TR").replace(/[^a-zçğıöşü0-9]/g,"")));
    if(normalized.size!==questions.length)throw new Error("Tekrarlanan soru algılandı. Denemeyi yeniden oluştur.");
    startExam(shuffle(questions),`2025 Müzik Alanı Tarzı · ${count} Soru`);
  }catch(error){status.innerHTML=`<div class="result">Hata: ${esc(error.message)} Sorunsuz paketler korunmadığı için yeni deneme başlatılmadı; tekrar deneyebilirsin.</div>`;button.disabled=false}
}
const REAL_2026_QUALITY=globalThis.Real2026Quality;
if(!REAL_2026_QUALITY)throw new Error("2026 çeşitlilik ve doğrulama motoru yüklenemedi.");
const REAL_2026_HISTORY_KEY="real2026QuestionHistoryV2622";
const REAL_2026_OLD_HISTORY_KEYS=["real2026QuestionHistoryV2621","real2026QuestionHistoryV2620"];
const REAL_2026_HISTORY_LIMIT=600;
const REAL_2026_COMPARISON_LIMIT=260;
const REAL_2026_BATCH_SIZE=10;
const REAL_2026_WORKERS=2;
const REAL_2026_REQUEST_TIMEOUT_MS=45000;
const REAL_2026_FOCUS_REASSIGN_LIMIT=6;
const REAL_2026_DRAFT_KEY="real2026GenerationDraftV2625";
const REAL_2026_ANGLES=[
  {key:"definition-to-term",label:"tanımdan terimi bulma"},
  {key:"term-to-feature",label:"terimden doğru özelliği bulma"},
  {key:"matching",label:"doğru eşleştirmeyi bulma"},
  {key:"incorrect-matching",label:"yanlış eşleştirmeyi ayırt etme"},
  {key:"short-context",label:"kısa uygulama veya icra bağlamı"},
  {key:"comparison",label:"yakın iki kavramı karşılaştırma"},
  {key:"structure-sequence",label:"yapı, sıra veya oluşumu belirleme"},
  {key:"work-person-period",label:"eser, kişi ve dönem bağlantısı"}
];
const REAL_2026_BLUEPRINT=[
  {area:"Müzik terimleri ve nüanslar",weight:12,focusBank:[
    ["terms:cantabile","cantabile ve şarkı söyler gibi icra"],["terms:dolce","dolce ve yumuşak/tatlı ifade"],["terms:espressivo","espressivo ve anlatımlı icra"],["terms:legato-staccato","legato ile staccato ayrımı"],["terms:marcato-tenuto","marcato ile tenuto ayrımı"],["terms:accelerando","accelerando ve giderek hızlanma"],["terms:ritardando","ritardando ve giderek yavaşlama"],["terms:rallentando","rallentando ve tempo değişimi"],["terms:a-tempo","a tempo ile önceki hıza dönüş"],["terms:rubato","tempo rubato ve esnek zamanlama"],["terms:crescendo-diminuendo","crescendo ile diminuendo ayrımı"],["terms:poco-a-poco-crescendo","poco a poco crescendo ifadesinin bütünü"],["terms:subito-piano","subito piano ve ani gürlük değişimi"],["terms:morendo","morendo teriminin icra anlamı"],["terms:smorzando","smorzando teriminin icra anlamı"],["terms:fermata","fermata ve süre uzatma"],["terms:sostenuto","sostenuto ve sesleri tutarak icra"],["terms:con-brio","con brio ve canlı icra"],["terms:maestoso","maestoso ve görkemli icra"],["terms:agitato","agitato ve huzursuz/heyecanlı ifade"]
  ]},
  {area:"Müzik algısı ve müzik psikolojisi",weight:5,focusBank:[
    ["perception:amusia-definition","amusia kavramının sınırları"],["perception:congenital-acquired-amusia","doğuştan ve edinilmiş amusia ayrımı"],["perception:pitch-rhythm","ezgi/perde ve ritim işleme bozukluklarının ayrımı"],["perception:beat-deafness","ritmik vuruş algısı güçlüğü"],["perception:musical-anhedonia","müzikal haz yitimi ile algı bozukluğu ayrımı"],["perception:auditory-agnosia","işitsel agnozi ile amusia ayrımı"],["perception:aphasia-amusia","afazi ile amusia ayrımı"],["perception:absolute-relative-pitch","mutlak ve bağıl işitme ayrımı"],["perception:musical-memory","müziksel bellek ve tanıma"],["perception:prosody-music","konuşma prozodisi ile müziksel algı ayrımı"]
  ]},
  {area:"Dönem, besteci ve eser",weight:16,focusBank:[
    ["period:machaut-medieval","Guillaume de Machaut ve Orta Çağ"],["period:palestrina-renaissance","Palestrina ve Rönesans"],["period:monteverdi-transition","Monteverdi ve Rönesans-Barok geçişi"],["period:vivaIldi-four-seasons","Vivaldi ve Dört Mevsim"],["period:handel-messiah","Handel ve Messiah"],["period:bach-wtc","Bach ve Das Wohltemperierte Klavier"],["period:haydn-classical","Haydn ve Klasik dönem"],["period:mozart-classical","Mozart ve Klasik dönem"],["period:beethoven-transition","Beethoven ve Klasik-Romantik geçişi"],["period:schubert-romantic","Schubert ve erken Romantik dönem"],["period:berlioz-fantastique","Berlioz ve Symphonie fantastique"],["period:chopin-romantic","Chopin ve Romantik dönem"],["period:liszt-symphonic-poem","Liszt ve senfonik şiir"],["period:wagner-music-drama","Wagner ve müzikli drama"],["period:verdi-opera","Verdi ve 19. yüzyıl operası"],["period:tchaikovsky-romantic","Çaykovski ve Romantik dönem"],["period:brahms-romantic","Brahms ve Romantik dönem"],["period:mahler-late-romantic","Mahler ve geç Romantik dönem"],["period:debussy-modern","Debussy ve 20. yüzyıla geçiş"],["period:ravel-modern","Ravel ve 20. yüzyıl başı"],["period:stravinsky-rite","Stravinsky ve Bahar Ayini"],["period:schoenberg-twelve-tone","Schoenberg ve on iki ses tekniği"],["period:bartok-modern","Bartók ve 20. yüzyıl"],["period:shostakovich-modern","Şostakoviç ve 20. yüzyıl"],["period:cage-contemporary","John Cage ve deneysel müzik"],["period:ligeti-contemporary","Ligeti ve çağdaş müzik"],["period:minimalism","Steve Reich/Philip Glass ve minimalizm"]
  ]},
  {area:"Türk halk müziği ve bağlama",weight:10,focusBank:[
    ["folk:cura","cura ve bağlama ailesindeki yeri"],["folk:divan-sazi","divan sazı ve bağlama ailesindeki yeri"],["folk:tambura-baglama","tambura ile bağlama boyut/ses ilişkisi"],["folk:meydan-sazi","meydan sazı ve bağlama ailesi"],["folk:cogur","çöğürün bağlama ailesindeki yeri"],["folk:selpe-definition","şelpe tekniğinin temel özelliği"],["folk:tezene","tezene/mızrap kullanımının özelliği"],["folk:baglama-duzeni","bağlama düzeninin tel sesleri ve adı"],["folk:bozuk-duzen","bozuk düzenin temel özelliği"],["folk:kopuz-baglama","kopuz ile bağlama arasındaki tarihsel ilişki"],["folk:kabak-kemane","kabak kemanenin çalgı ailesi ve icrası"],["folk:kaval","kavalın çalgı ailesi ve icrası"],["folk:zurna","zurnanın çalgı ailesi ve kullanım ortamı"],["folk:sipsi","sipsinin çalgı ailesi ve yöresel kullanımı"],["folk:tulum","tulumun çalgı ailesi ve yöresel kullanımı"],["folk:davul-zurna","davul-zurna birlikteliğinin icra işlevi"]
  ]},
  {area:"Türk müziği makam ve değiştirici işaretleri",weight:8,focusBank:[
    ["makam:dizi-seyir","makam, dizi ve seyir kavramlarının ayrımı"],["makam:karar-guclu-yeden","karar, güçlü ve yeden görevleri"],["makam:notation-context","makam perdesinde notasyon/aktarım bağlamının belirtilmesi"],["makam:koma-signs","Türk müziği değiştirici işaretleri ve koma değerleri"],["makam:hicaz-tetrachord","Hicaz dörtlüsünün aralık yapısı"],["makam:ussak-tetrachord","Uşşak dörtlüsünün aralık yapısı"],["makam:rast-pentachord","Rast beşlisinin aralık yapısı"],["makam:huseyni-structure","Hüseyni makamında dizi ve seyir bilgisi"],["makam:nihavent-structure","Nihavent makamında dizi ve seyir bilgisi"],["makam:segah-pitch","Segâh perdesinin işlevi ve koma bağlamı"],["makam:hicaz-structure","Hicaz makamının tam dizi/karar/seyir bağlamı"],["makam:ussak-huseyni","Uşşak ile Hüseyni makamlarını ayıran belirgin özellik"],["makam:transposition","Türk müziğinde göçürme/transpozisyon"],["makam:full-equipment","tam donanımdan makam belirleme; karar ve güçlü bilgisiyle birlikte"]
  ]},
  {area:"Armoni tarihi ve müzik kuramı kaynakları",weight:6,focusBank:[
    ["harmony:rameau-traite","Rameau ve Traité de l'harmonie'nin tarihsel bağlamı"],["harmony:fundamental-bass","Rameau'nun temel bas kavramı"],["harmony:zarlino","Zarlino ve Le istitutioni harmoniche"],["harmony:fux-gradus","Fux ve Gradus ad Parnassum"],["harmony:riemann-function","Hugo Riemann ve işlevsel armoni"],["harmony:schoenberg-harmonielehre","Schoenberg ve Harmonielehre"],["harmony:figured-bass","şifreli basın armoni uygulamasındaki işlevi"],["harmony:basso-continuo","basso continuo ve Barok armoni pratiği"],["harmony:species-counterpoint","tür kontrpuanı ve öğretim geleneği"],["harmony:triad-inversion","üçlü akor çevrimleri"],["harmony:cadence-functions","kadans ve tonal işlev ilişkisi"],["harmony:circle-fifths","beşliler çemberinin tonal ilişkilerde kullanımı"]
  ]},
  {area:"Biçimler ve oda müziği toplulukları",weight:10,focusBank:[
    ["forms:duo","duo ve iki icracılı topluluk"],["forms:trio","trio ve üç icracılı topluluk"],["forms:string-quartet","yaylı çalgılar dörtlüsünün standart kadrosu"],["forms:quintet-five","quintet/kentet kavramı"],["forms:piano-quintet","piyano beşlisinin standart kadrosu"],["forms:sextet","sextet ve altı icracılı topluluk"],["forms:septet","septet ve yedi icracılı topluluk"],["forms:octet","octet ve sekiz icracılı topluluk"],["forms:concerto-cycle","Klasik konçertoda yaygın hızlı-yavaş-hızlı plan"],["forms:sonata-cycle","Klasik sonat döngüsünün bölüm düzeni"],["forms:rondo","rondo biçiminde ana temanın dönüşü"],["forms:minuet-trio","menuet-trio düzeni"],["forms:theme-variations","tema ve çeşitlemeler biçimi"],["forms:fugue","fügde konu ve taklit düzeni"],["forms:passacaglia-chaconne","pasakalya ile chaconne ilişkisi"],["forms:suite-dances","Barok süitte temel dansların sırası"],["forms:binary-ternary","iki ve üç bölmeli biçim ayrımı"],["forms:scherzo-trio","scherzo-trio yapısı"]
  ]},
  {area:"Kıbrıs Türk müziği ve sahne eserleri",weight:7,focusBank:[
    ["cyprus:arap-ali-composer","Arap Ali Destanı'nın bestecisi"],["cyprus:arap-ali-libretto","Arap Ali Destanı'nın librettosu"],["cyprus:arap-ali-genre","Arap Ali Destanı'nın türü ve sahne eseri niteliği"],["cyprus:ali-hoca-work","Ali Hoca'nın doğrulanmış başka bir eseri"],["cyprus:composer-work","Kıbrıs Türk besteci-eser eşleştirmesi"],["cyprus:folk-song-source","Kıbrıs Türk halk ezgisi ve derleme kaynağı"],["cyprus:music-institution","Kıbrıs Türk müzik kurumu ve işlevi"],["cyprus:stage-history","Kıbrıs Türk sahne müziği tarihinden doğrulanmış olay"],["cyprus:choir-orchestra","Kıbrıs Türk koro/orkestra geleneğinden kurum"],["cyprus:artist-contribution","Kıbrıs Türk müziğinde kişi ve katkı eşleştirmesi"],["cyprus:instrument-practice","Kıbrıs Türk müziğinde doğrulanmış çalgı/icra pratiği"],["cyprus:publication-archive","Kıbrıs Türk müziği üzerine resmî/akademik yayın veya arşiv"]
  ]},
  {area:"Dünya müzik kültürleri",weight:6,focusBank:[
    ["world:noh","Japon Noh tiyatrosunun temel özellikleri"],["world:kabuki-noh","Kabuki ile Noh ayrımı"],["world:gagaku","Japon saray müziği gagaku"],["world:gamelan","Endonezya gamelan topluluğu"],["world:wayang-kulit","wayang kulit ve müzik ilişkisi"],["world:hindustani-carnatic","Hindustani ve Karnatik geleneklerin ayrımı"],["world:chinese-opera","Çin operasında müzik ve sahne öğeleri"],["world:pansori","Kore pansori anlatı geleneği"],["world:flamenco","flamenkoda cante-toque-baile öğeleri"],["world:griot","Batı Afrika griot/jeli geleneği"],["world:arab-maqam","Arap makam geleneğinin temel kavramı"],["world:shakuhachi","Japon shakuhachi çalgısı ve geleneği"]
  ]},
  {area:"Opera, bale ve sahne sanatları",weight:7,focusBank:[
    ["stage:ballet-five-positions","balenin beş temel ayak pozisyonu"],["stage:plie","plié hareketinin temel anlamı"],["stage:releve","relevé hareketinin temel anlamı"],["stage:arabesque","arabesque pozisyonunun temel özelliği"],["stage:pirouette","pirouette dönüşü"],["stage:pas-de-deux","pas de deux kavramı"],["stage:turnout","balede turnout/dışa dönüklük"],["stage:en-pointe","en pointe tekniği"],["stage:port-de-bras","port de bras ve kol hareketleri"],["stage:corps-de-ballet","corps de ballet topluluğu"],["stage:libretto","operada libretto"],["stage:aria-recitative","arya ile resitatif ayrımı"],["stage:overture","uvertürün sahne eserindeki işlevi"],["stage:leitmotif","leitmotif ve dramatik işlev"],["stage:grand-pas","grand pas de deux bölümleri"],["stage:opera-ensemble","operada solo, ansambl ve koro ayrımı"]
  ]}
].map(group=>({...group,focusBank:group.focusBank.map(([key,label])=>({key,label}))}));
const REAL_2026_FACT_GUARDRAILS=`
Kesin bilgi çıpaları:
- Ritardando (rit.) tempoyu giderek/yavaş yavaş düşürmek, yani giderek yavaşlamaktır. “Çok hızlı yavaşlama”, “birden yavaşlama” veya bir gürlük terimi değildir.
- Poco a poco “azar azar”; poco a poco crescendo ses gürlüğünü azar azar/giderek artırmaktır.
- Divan sazı bağlama ailesinin büyük üyelerindendir ve bağlama ailesinin temel icrasında tezene/mızrap kullanılır. Şelpe ise tezene kullanmadan parmaklarla yapılan ayrı bir bağlama tekniğidir. Divan sazını ayırt eden doğru özellik olarak “parmakla çalınır” ifadesini kullanma.
- Cura, bağlama ailesinin küçük üyesidir. Cantabile “şarkı söyler gibi”; amusia müziksel algı/tanıma yetisindeki bozukluktur.
- Quintet/kentet beş icracı ya da beş çalgı için topluluk/eserdir. Klasik konçertonun yaygın üç bölüm sırası hızlı-yavaş-hızlıdır.
- Noh, Japonya'nın geleneksel maskeli, müzik ve dans içeren tiyatro geleneğidir.
- Rameau'nun Traité de l'harmonie eseri 1722 tarihlidir; bunu “dünyanın tartışmasız ilk armoni kitabı” diye genelleme, modern armoni kuramının temel ve ilk sistematik çalışmalarından biri olarak bağlamlandır.
- Arap Ali Destanı'nın bestecisi Ali Hoca, librettosu Havva Tekin'dir.
- Makamı yalnız tek bir koma işaretinden çıkartma; tam donanım, dizi veya karar-güçlü/seyir bilgisi vermeden makam sorusu kurma.
- Rast makamının kararını, kullanılan notasyon/aktarım düzenini açıkça belirtmeden mutlak “Do notası” diye verme.
- Oliver Sacks'i besteci veya amusia araştırmalarının tartışmasız ilk/temel bilim insanı gibi sunma; kişi rolünü kaynakta geçtiği biçimde doğru yaz.
- Çeldiriciler de gerçek kişi, eser, terim veya çalgı olmalı; uydurma eser/terim kullanma.`;
function real2026History(){return store.get(REAL_2026_HISTORY_KEY,[]).filter(item=>item&&item.question).slice(0,REAL_2026_HISTORY_LIMIT).map(item=>REAL_2026_QUALITY.makeRecord(item,item))}
function writeReal2026History(records){
  const seen=new Set(),unique=[];
  for(const item of records){const record=REAL_2026_QUALITY.makeRecord(item,item),key=REAL_2026_QUALITY.compact(record.question)||REAL_2026_QUALITY.compact(`${record.targetEntity}|${record.testedFact}`);if(!key||seen.has(key))continue;seen.add(key);unique.push(record);if(unique.length>=REAL_2026_HISTORY_LIMIT)break}
  store.set(REAL_2026_HISTORY_KEY,unique);
}
function migrateReal2026History(){
  if(store.get("real2026HistoryMigratedV2622",false))return;
  const recovered=REAL_2026_OLD_HISTORY_KEYS.flatMap(key=>store.get(key,[]))
    .concat(savedTests().filter(test=>/2026 Gerçek Müzik Sınavı/i.test(test.title||"")).flatMap(test=>test.questions||[]))
    .concat(store.get("hardQuestionItems",[]).filter(question=>/2026 Gerçek Sınav/i.test(question?.area||"")))
    .map(question=>REAL_2026_QUALITY.makeRecord(question,{blueprintArea:String(question.area||"").replace(/^.*?·\s*/,"")}));
  if(recovered.length)writeReal2026History([...recovered,...real2026History()]);
  store.set("real2026HistoryMigratedV2622",true);
}
function real2026ComparisonHistory(){return [...real2026History().slice(0,REAL_2026_COMPARISON_LIMIT),...REAL_2026_QUALITY.referenceExclusions()]}
function rememberReal2026Questions(questions,generationNo){
  const now=new Date().toISOString(),records=questions.map(question=>REAL_2026_QUALITY.makeRecord(question,{generatedAt:now,generationNo}));
  writeReal2026History([...records,...real2026History()]);
}
function real2026AvoidListForFocuses(focuses,history,limit=96){
  const normalizedAreas=new Set(focuses.map(focus=>REAL_2026_QUALITY.normalize(focus.area))),seen=new Set();
  return history.filter(item=>!item.blueprintArea||normalizedAreas.has(REAL_2026_QUALITY.normalize(item.blueprintArea))).filter(item=>{
    const key=REAL_2026_QUALITY.normalize(`${item.targetEntity}|${item.testedFact}`);if(!key||seen.has(key))return false;seen.add(key);return true;
  }).slice(0,limit).map(item=>`- Alan: ${item.blueprintArea||"önceki"} | ${item.focusKey||item.conceptFamily||"önceki"} | Hedef: ${item.targetEntity||"-"} | Ölçülen bilgi: ${item.testedFact||item.question}` ).join("\n")||"- Bu alanlarda kayıtlı önceki soru yok; yine de aynı paket içinde bilgi tekrarı yapma.";
}
function real2026CandidateSchema(count,focusKeys,angleKeys,verified=false){
  const source={type:"object",additionalProperties:false,properties:{name:{type:"string"},url:{type:"string"}},required:["name","url"]};
  const properties={question:{type:"string"},choices:{type:"object",additionalProperties:false,properties:{A:{type:"string"},B:{type:"string"},C:{type:"string"},D:{type:"string"},E:{type:"string"}},required:["A","B","C","D","E"]},answer:{type:"string",enum:["A","B","C","D","E"]},explanation:{type:"string"},topic:{type:"string"},difficulty:{type:"string",enum:["Kolay","Orta","Zor"]},focusKey:{type:"string",enum:focusKeys},angleKey:{type:"string",enum:angleKeys},conceptFamily:{type:"string"},targetEntity:{type:"string"},testedFact:{type:"string"}};
  const required=["question","choices","answer","explanation","topic","difficulty","focusKey","angleKey","conceptFamily","targetEntity","testedFact"];
  if(verified){properties.verificationSources={type:"array",items:source,minItems:2,maxItems:4};required.push("verificationSources")}
  const question={type:"object",additionalProperties:false,properties,required};
  return {type:"object",additionalProperties:false,properties:{questions:{type:"array",items:question,minItems:count,maxItems:count}},required:["questions"]};
}
function real2026NormalizedText(value){return String(value||"").toLocaleLowerCase("tr-TR").replace(/[’‘]/g,"'").replace(/\s+/g," ").trim()}
function normalizeReal2026Question(q,job,index,i,requireSources=false){
  const choices={},answer=String(q.answer||"").toUpperCase();
  ["A","B","C","D","E"].forEach(key=>choices[key]=String(q.choices?.[key]||"").trim());
  const focusKey=String(q.focusKey||"").trim(),expected=job.focuses.find(focus=>focus.key===focusKey);
  const item={question:String(q.question||"").trim(),choices,answer,explanation:String(q.explanation||"").trim(),topic:String(q.topic||expected?.area||job.area||"2026 sınav profili").trim(),difficulty:q.difficulty,focusKey,angleKey:String(q.angleKey||"").trim(),conceptFamily:String(q.conceptFamily||"").trim(),targetEntity:String(q.targetEntity||"").trim(),testedFact:String(q.testedFact||"").trim(),blueprintArea:expected?.area||job.area||"2026 sınav profili",verificationSources:Array.isArray(q.verificationSources)?q.verificationSources.map(s=>({name:String(s?.name||"").trim(),url:String(s?.url||"").trim()})):[]};
  validateReal2026Question(item,`${index+1}.${i+1}`,requireSources,expected);return item;
}
function validateReal2026Question(q,label,requireSources=false,expectedFocus=null){
  const keys=["A","B","C","D","E"],root=real2026NormalizedText(q.question),correct=real2026NormalizedText(q.choices?.[q.answer]),explanation=real2026NormalizedText(q.explanation),combined=`${root} ${correct} ${explanation}`;
  if(!q.question||!keys.every(key=>String(q.choices?.[key]||"").trim())||!keys.includes(q.answer)||!q.explanation)throw new Error(`${label} numaralı soru eksik.`);
  if(new Set(keys.map(key=>real2026NormalizedText(q.choices[key]))).size!==5)throw new Error(`${label} numaralı soruda yinelenen seçenek var.`);
  if(q.explanation.length<24)throw new Error(`${label} numaralı sorunun açıklaması doğrulama için yetersiz.`);
  if(!expectedFocus||expectedFocus.angleKey!==q.angleKey)throw new Error(`${label} numaralı soru kendisine verilen özgün odak ve soru biçimini korumadı.`);
  if(!q.conceptFamily||q.conceptFamily.length<4||!q.targetEntity||q.targetEntity.length<2||!q.testedFact||q.testedFact.length<12)throw new Error(`${label} numaralı sorunun anlam kimliği eksik.`);
  const targetOverlap=REAL_2026_QUALITY.jaccard(q.targetEntity,combined),factOverlap=REAL_2026_QUALITY.jaccard(q.testedFact,`${correct} ${explanation}`),answerOverlap=REAL_2026_QUALITY.jaccard(correct,`${q.targetEntity} ${q.testedFact} ${explanation}`);
  if(targetOverlap===0)throw new Error(`${label} numaralı sorunun hedef varlığı soru ve açıklamayla uyuşmuyor.`);
  if(factOverlap<0.12)throw new Error(`${label} numaralı sorunun ölçülen bilgi kaydı açıklamayla uyuşmuyor.`);
  if(answerOverlap===0)throw new Error(`${label} numaralı sorunun işaretli cevabı açıklamayla doğrulanamıyor.`);
  const negative=/(değildir|yanlıştır|söylenemez|olamaz|değildir)/.test(root);
  if(/ritardando|rit\./.test(root)&&!negative&&!/(yavaş|tempoyu düşür|gecik)/.test(`${correct} ${explanation}`))throw new Error(`${label} numaralı soruda ritardando tanımı hatalı.`);
  if(/ritardando/.test(combined)&&/(çok hızlı yavaş|aniden yavaş|birden yavaş)/.test(`${correct} ${explanation}`))throw new Error(`${label} numaralı soruda ritardando ani veya çok hızlı yavaşlama diye tanımlanmış.`);
  if(/poco a poco crescendo/.test(root)&&!negative&&(!/(azar azar|giderek|yavaş yavaş)/.test(`${correct} ${explanation}`)||!/(gür|ses şiddet|kuvvet)/.test(`${correct} ${explanation}`)))throw new Error(`${label} numaralı soruda poco a poco crescendo tanımı hatalı.`);
  if(/divan sazı|divan bağlama/.test(root)&&!negative&&/(parmakla çal|şelpe)/.test(correct)&&!/(tezene|mızrap)/.test(correct))throw new Error(`${label} numaralı soruda Divan sazı parmakla çalınır diye doğru kabul edilmiş.`);
  if(/divan sazı|divan bağlama/.test(explanation)&&/(parmakla çalınır|yalnız parmakla)/.test(explanation)&&!/(değil|yanlış)/.test(explanation))throw new Error(`${label} numaralı sorunun Divan sazı açıklaması hatalı.`);
  if(/rast makamı/.test(combined)&&/(karar perdesi.{0,30}\bdo\b|\bdo\b.{0,30}karar perdesi)/.test(combined)&&!/(notasyon|aktarım|göçür|transpoz|yerinden|bolahenk)/.test(combined))throw new Error(`${label} numaralı soruda Rast makamı bağlamsız biçimde Do notasına sabitlendi.`);
  if(/aşağıdaki bestecilerden/.test(root)&&/oliver sacks/.test(correct))throw new Error(`${label} numaralı soruda Oliver Sacks besteci gibi gösterildi.`);
  if(/ilk armoni kitabı|dünyanın ilk.*armoni|tarihteki ilk.*armoni/.test(root)&&!/sistematik|modern armoni|bağlam/.test(combined))throw new Error(`${label} numaralı soruda tartışmalı “ilk armoni kitabı” genellemesi yapıldı.`);
  if(requireSources){
    const sourceAudit=REAL_2026_QUALITY.validateSources(q.verificationSources);
    if(!sourceAudit.ok)throw new Error(`${label} numaralı sorunun kaynak denetimi geçmedi: ${sourceAudit.errors.join("; ")}`);
    q.verificationSources=sourceAudit.sources;
  }
  return true;
}
function scaledReal2026Blueprint(total,history,generationNo){
  const weights=REAL_2026_BLUEPRINT.reduce((n,x)=>n+x.weight,0),raw=REAL_2026_BLUEPRINT.map(x=>({...x,count:Math.floor(total*x.weight/weights)}));
  let left=total-raw.reduce((n,x)=>n+x.count,0),i=(generationNo*3+6)%raw.length;
  while(left-->0){raw[i%raw.length].count++;i++}
  let sequence=0;
  return raw.filter(x=>x.count>0).map((group,groupIndex)=>{
    const areaHistory=history.filter(item=>REAL_2026_QUALITY.normalize(item.blueprintArea)===REAL_2026_QUALITY.normalize(group.area));
    const chosen=REAL_2026_QUALITY.selectLeastUsedFocuses(group.focusBank,group.count,areaHistory,generationNo+groupIndex*3);
    const focuses=chosen.map(focus=>{const angle=REAL_2026_ANGLES[(generationNo+sequence+++groupIndex)%REAL_2026_ANGLES.length];return {...focus,area:group.area,angleKey:angle.key,angleLabel:angle.label}});
    return {...group,focuses};
  });
}
function buildReal2026Jobs(total,history,generationNo,batchSize=REAL_2026_BATCH_SIZE){
  const plan=scaledReal2026Blueprint(total,history,generationNo).flatMap(group=>group.focuses).map((focus,planIndex)=>({...focus,planIndex})),jobs=[];
  for(let at=0;at<plan.length;at+=batchSize){const focuses=plan.slice(at,at+batchSize);jobs.push({area:"Karma 2026 gerçek sınav profili",count:focuses.length,focuses,nonce:`${generationNo+1}-${jobs.length+1}-${Math.random().toString(36).slice(2,10)}`})}
  return jobs;
}
function splitReal2026Job(job){
  if(job.focuses.length<2)return [job];
  const middle=Math.ceil(job.focuses.length/2);
  return [job.focuses.slice(0,middle),job.focuses.slice(middle)].map((focuses,index)=>({...job,count:focuses.length,focuses,nonce:`${job.nonce}-s${index+1}-${Math.random().toString(36).slice(2,7)}`}));
}
function real2026ContentError(message){
  const error=message instanceof Error?message:new Error(String(message));
  error.real2026ContentFailure=true;
  return error;
}
function real2026FocusAnchor(focus){
  return REAL_2026_QUALITY.inferAnchor(`${focus?.key||""} ${focus?.label||""}`);
}
function reassignReal2026SingletonJob(job,priorRecords,reservedFocusKeys,reservedAnchors,reassignmentNo=0){
  if(job.count!==1||job.focuses.length!==1)return null;
  const current=job.focuses[0],group=REAL_2026_BLUEPRINT.find(item=>item.area===current.area);
  if(!group)return null;
  const records=(priorRecords||[]).map(item=>REAL_2026_QUALITY.makeRecord(item,item));
  const usedKeys=new Set([...reservedFocusKeys,...records.map(item=>item.focusKey).filter(Boolean)]);
  const usedAnchors=new Set([...reservedAnchors,...records.map(item=>item.anchor||REAL_2026_QUALITY.inferAnchor(`${item.question||""} ${item.targetEntity||""} ${item.testedFact||""}`)).filter(Boolean)]);
  const available=group.focusBank.filter(focus=>{
    if(usedKeys.has(focus.key))return false;
    const anchor=real2026FocusAnchor(focus);
    return !anchor||!usedAnchors.has(anchor);
  });
  if(!available.length)return null;
  const rotation=(Number.isInteger(current.planIndex)?current.planIndex:0)+reassignmentNo+1;
  const chosen=REAL_2026_QUALITY.selectLeastUsedFocuses(available,1,records,rotation)[0];
  const currentAngle=Math.max(0,REAL_2026_ANGLES.findIndex(angle=>angle.key===current.angleKey));
  const angle=REAL_2026_ANGLES[(currentAngle+reassignmentNo+1)%REAL_2026_ANGLES.length];
  const replacement={...chosen,area:group.area,angleKey:angle.key,angleLabel:angle.label,planIndex:current.planIndex};
  reservedFocusKeys.add(replacement.key);
  const anchor=real2026FocusAnchor(replacement);if(anchor)reservedAnchors.add(anchor);
  return {...job,count:1,focuses:[replacement],nonce:`${job.nonce}-f${reassignmentNo+1}-${Math.random().toString(36).slice(2,7)}`};
}
async function runReal2026Jobs(jobs,count,comparisonHistory,generateBatch,onProgress=()=>{},workerCount=REAL_2026_WORKERS,seedQuestions=[]){
  const questionsByPlan=new Array(count),acceptedRecords=[];
  seedQuestions.forEach(question=>{if(Number.isInteger(question?._planIndex)&&question._planIndex>=0&&question._planIndex<count&&!questionsByPlan[question._planIndex])questionsByPlan[question._planIndex]=question});
  acceptedRecords.push(...questionsByPlan.filter(Boolean).map(question=>REAL_2026_QUALITY.makeRecord(question,question)));
  const reservedFocusKeys=new Set(jobs.flatMap(job=>job.focuses).map(focus=>focus.key).filter(Boolean));
  const reservedAnchors=new Set(jobs.flatMap(job=>job.focuses).map(real2026FocusAnchor).filter(Boolean));
  let next=0,done=questionsByPlan.filter(Boolean).length,requestIndex=0;
  const progress=(stage,extra={})=>onProgress({stage,done,count,...extra});
  async function completeJob(originalJob,reassignmentDepth=0){
    const missingFocuses=originalJob.focuses.filter(focus=>!questionsByPlan[focus.planIndex]);
    if(!missingFocuses.length)return;
    const job={...originalJob,count:missingFocuses.length,focuses:missingFocuses};
    const maxAttempts=1;let lastError;
    for(let attempt=1;attempt<=maxAttempts;attempt++){
      const currentRequest=requestIndex++;progress("research",{job,attempt,maxAttempts});
      try{
        const prior=[...comparisonHistory,...acceptedRecords],batch=await generateBatch(job,currentRequest,Math.max(jobs.length,requestIndex),prior),audit=REAL_2026_QUALITY.auditNovelty(batch,[...comparisonHistory,...acceptedRecords]);
        if(!audit.ok)throw real2026ContentError(`Paketler arası tekrar: ${audit.duplicates[0].reason}`);
        batch.forEach(question=>{if(!Number.isInteger(question._planIndex)||questionsByPlan[question._planIndex])throw new Error("Soru planı aynı konuma iki kez yazılmaya çalışıldı.")});
        acceptedRecords.push(...audit.records);batch.forEach(question=>{questionsByPlan[question._planIndex]=question});done+=batch.length;progress("accepted",{job,questions:questionsByPlan.filter(Boolean)});return;
      }catch(error){lastError=error;if(error?.retryable===true&&attempt>=maxAttempts)throw error}
    }
    if(job.count>1){progress("split",{job});for(const part of splitReal2026Job(job))await completeJob(part);return}
    if(lastError?.real2026ContentFailure===true&&reassignmentDepth<REAL_2026_FOCUS_REASSIGN_LIMIT){
      const replacement=reassignReal2026SingletonJob(job,[...comparisonHistory,...acceptedRecords],reservedFocusKeys,reservedAnchors,reassignmentDepth);
      if(replacement){progress("reassigned",{job,replacement,error:lastError,reassignment:reassignmentDepth+1});return completeJob(replacement,reassignmentDepth+1)}
    }
    throw lastError||new Error("Bir soru güvenilir biçimde üretilemedi.");
  }
  let failedJobs=[];
  async function worker(){while(next<jobs.length){const job=jobs[next++];try{await completeJob(job)}catch(error){failedJobs.push({job,error})}}}
  await Promise.all(Array.from({length:Math.min(workerCount,jobs.length)},worker));
  for(let rescueRound=1;failedJobs.length&&rescueRound<=1;rescueRound++){
    const rescue=failedJobs.flatMap(item=>item.job.count>1?splitReal2026Job(item.job):[item.job]).map(job=>({...job,nonce:`${job.nonce}-r${rescueRound}-${Math.random().toString(36).slice(2,7)}`}));
    failedJobs=[];let rescueNext=0;
    async function rescueWorker(){while(rescueNext<rescue.length){const job=rescue[rescueNext++];try{await completeJob(job)}catch(error){failedJobs.push({job,error})}}}
    await Promise.all(Array.from({length:Math.min(workerCount,rescue.length)},rescueWorker));
  }
  if(failedJobs.length){const failure=failedJobs[0].error,error=failure instanceof Error?failure:new Error(String(failure||"Soru üretimi tamamlanamadı."));error.completed=done;error.questions=questionsByPlan.filter(Boolean);throw error}
  const questions=questionsByPlan.filter(Boolean);if(questions.length!==count){const error=new Error(`${count} sorunun tamamı üretilemedi.`);error.completed=done;throw error}
  return {questions,acceptedRecords,done,requestCount:requestIndex};
}
function renderRealMusic2026Generator(){
  migrateReal2026History();
  const saved=+store.get("real2026Count",35);
  setTitle("2026 Gerçek Müzik Sınavı Tarzı","Hatırlanan gerçek soru türlerine göre",true);
  app.innerHTML=`<section class="hero khk-2025-hero"><h2>2026 Gerçek Sınav Profilinden Yeni Sorular</h2><p>Bu bölüm sabit soruları göstermez. Sınavdan hatırladığın başlıklara dayanarak AI aynı kapsam ve düzeyde, önceki denemelerden farklı sorular üretir.</p></section>
  <div class="result"><b>Temel alınan gerçek başlıklar:</b> cantabile, amusia, dönem–besteci–eser, cura, makam ve koma işaretleri, şelpe, armoni tarihi, hızlı–yavaş–hızlı biçim, quintet, Arap Ali Destanı, poco a poco crescendo, Noh ve bale pozisyonları.</div>
  <label>Kaç soru oluşturulsun? (5–100)</label><input id="real-2026-count" type="number" min="5" max="100" step="1" value="${Math.min(100,Math.max(5,saved))}">
  <label class="check-row"><input type="checkbox" checked disabled><span>Her soru A–E beş seçenekli, tek doğru cevaplı ve gerçek 2026 sınav üslubunda üretilecek</span></label>
  <div class="print-exam-note"><b>↻ Tekrar önleme hafızası:</b> Son ${REAL_2026_COMPARISON_LIMIT} soru ile bu iki PDF'de saptanan tekrarlar karşılaştırılır. Aynı bilgi farklı cümleyle sorulsa bile reddedilir. Bu cihazda ${real2026History().length} yeni soru kayıtlı.</div>
  <div class="print-exam-note"><b>⚡ Hızlı üretim:</b> 5–10 soru tek hızlı AI çağrısında hazırlanır. Daha büyük denemeler 10'ar soruluk az sayıda pakete ayrılır; üretim sırasında ağır web araması yapılmaz.</div>
  <div class="print-exam-note"><b>🛡 Tamamlama koruması:</b> Geçen her paket cihazda taslak olarak saklanır. Uygulama kapanır veya bir çağrı hata verirse yeniden başlamak yerine eksik sorulardan devam eder.</div>
  <div class="print-exam-note"><b>🖨 Kalemle çözmek için:</b> Yazdırılabilir denemede sorular önce, cevap anahtarı ve kısa açıklamalar ayrı son sayfalarda hazırlanır.</div>
  <div class="actions"><button class="primary" id="real-2026-generate">Ekranda Deneme Oluştur</button><button class="secondary print-exam-button" id="real-2026-print">🖨 A4 PDF / Yazdır</button></div><div id="real-2026-status"></div>`;
  $("#real-2026-generate").onclick=()=>generateRealMusic2026Exam("screen");
  $("#real-2026-print").onclick=()=>generateRealMusic2026Exam("print");
}
function real2026Prompt(job,index,totalJobs){
  const focusPlan=job.focuses.map((focus,i)=>`${i+1}. Alan="${focus.area}" · focusKey="${focus.key}" · Odak: ${focus.label} · angleKey="${focus.angleKey}" · Soru biçimi: ${focus.angleLabel}`).join("\n");
  return `2026 KKTC Müzik Öğretmenliği alan sınavından adayın hatırladığı kapsam ve zorluk profiline uygun, fakat önceki üretimlerde ölçülmemiş ${job.count} adet beş seçenekli soru hazırla. Araştırma paketi ${index+1}/${totalJobs}; çeşitlilik kodu: ${job.nonce}.

Zorunlu odak planı (her satır için tam bir soru ve satırdaki anahtarları aynen kullan):
${focusPlan}

YASAKLI ÖNCEKİ BİLGİLER — bunları aynı veya farklı cümleyle yeniden sorma; aynı hedef varlığı da seçme:
${job.avoidList}

Kurallar:
- Her satır için yalnız kesin, temel ve tartışmasız bir olgu seç. Emin olmadığın, kaynağa göre değişen veya “ilk” iddiası taşıyan bilgiyi kullanma; aynı focusKey ve angleKey ile daha güvenli başka bir olgu seç.
- URL veya verificationSources üretme. Bu hızlı üretim aşamasında web araması yapma; doğruluk aşağıdaki kesin bilgi çıpaları ve uygulamanın yerel denetimleriyle korunacaktır.
- Yalnız soru kökünü değiştirmek yenilik değildir. Önceki sorudaki doğru cevap, hedef kişi/eser/terim ve ölçülen olgu değişmeden kalıyorsa o soru yasaktır.
- Her odak için farklı bir hedef kişi, eser, terim, çalgı veya olgu seç. Paket içinde aynı doğru cevabı, hedef varlığı, bilgi veya soru kalıbını kullanma.
- Soru kökleri gerçek sınavdaki gibi çoğunlukla kısa ve doğrudan, gerektiğinde orta uzunlukta olsun; akademik makale dili kullanma.
- A, B, C, D, E olmak üzere beş güçlü seçenek ver. Çeldiriciler doğru cevapla aynı kavram ailesinden olsun.
- Yaklaşık %35 kolay, %50 orta, %15 zor dağılımını koru. Gereksiz ayrıntı ve tartışmalı “ilk” bilgileri kullanma.
- Makam sorusunda makamı belirlemeye yetecek tam donanım/dizi bilgisini yaz; yalnız bir koma işaretiyle belirsiz soru kurma.
- Armoni tarihindeki ilk temel kuramsal eser sorularında Rameau'nun 1722 tarihli Traité de l’harmonie eserini doğru bağlamda kullan.
- Arap Ali Destanı için besteci Ali Hoca, libretto Havva Tekin bilgisini karıştırma.
- Her sorunun doğru cevabını ve 1-2 cümlelik öğretici açıklamasını ver. Açıklamada doğru seçenek açıkça anılsın ve neden doğru olduğu yazılsın.
- conceptFamily alanına dar kavram ailesini, targetEntity alanına sorunun ölçtüğü en özel kişi/eser/terim/çalgıyı, testedFact alanına doğrulanan olguyu tek kısa cümleyle yaz. “Müzik”, “dönem” veya “terim” gibi geniş hedefler kullanma.
- Olgusal bilgileri güvenilir akademik veya resmî kaynaklarla doğrula; emin olmadığın bilgiden soru üretme. Aşağıdaki bilgi çıpalarına kesinlikle uy:
${REAL_2026_FACT_GUARDRAILS}

Yalnız yapılandırılmış JSON döndür.`;
}
async function generateReal2026Batch(job,index,totalJobs,priorRecords){
  const focusKeys=job.focuses.map(focus=>focus.key),angleKeys=[...new Set(job.focuses.map(focus=>focus.angleKey))];
  const prompt=real2026Prompt({...job,avoidList:real2026AvoidListForFocuses(job.focuses,priorRecords)},index,totalJobs);
  const text=await openAIWebText(prompt,"Sen KKTC müzik öğretmenliği alan sınavları için hızlı ve titiz bir soru editörüsün. Verilen odak planını aynen izle; yalnız kesin bildiğin, tartışmasız bilgileri kullan. Adayın hatırladığı 2026 soru türlerini kapsam ve zorluk profili olarak al; önceki doğru cevabı, hedef varlığı veya ölçülen bilgiyi tekrar etme. Gereksiz açıklama yapmadan yalnız istenen yapılandırılmış JSON'u döndür.",{model:"gpt-4.1-mini",maxOutputTokens:Math.max(2600,job.count*430),jsonSchema:real2026CandidateSchema(job.count,focusKeys,angleKeys,false),schemaName:`real_music_2026_fast_${index+1}_${Date.now()%100000}`,webSearch:false,reasoningEffort:"low",timeoutMs:REAL_2026_REQUEST_TIMEOUT_MS,networkAttempts:1});
  try{
    const parsed=parseJsonResponse(text);
    if(!Array.isArray(parsed.questions)||parsed.questions.length!==job.count)throw new Error("Araştırma paketi eksik üretildi.");
    const normalized=parsed.questions.map((q,i)=>normalizeReal2026Question(q,job,index,i,false)),byFocus=new Map(normalized.map(question=>[question.focusKey,question]));
    if(byFocus.size!==job.count||job.focuses.some(focus=>!byFocus.has(focus.key)))throw new Error("Odak planındaki konuların tamamı birer kez kullanılmadı.");
    const ordered=job.focuses.map(focus=>byFocus.get(focus.key)),audit=REAL_2026_QUALITY.auditNovelty(ordered,priorRecords);
    if(!audit.ok)throw new Error(`Tekrar denetimi soruyu reddetti: ${audit.duplicates[0].reason}`);
    return ordered.map((q,i)=>{const focus=job.focuses.find(item=>item.key===q.focusKey);return {id:`real2026_${Date.now()}_${index}_${i}_${Math.random().toString(36).slice(2,7)}`,question:q.question,choices:q.choices,answer:q.answer,explanation:q.explanation,area:`2026 Gerçek Sınav Tarzı · ${q.topic||q.blueprintArea}`,blueprintArea:q.blueprintArea,topic:q.topic,difficulty:q.difficulty,focusKey:q.focusKey,angleKey:q.angleKey,conceptFamily:q.conceptFamily,targetEntity:q.targetEntity,testedFact:q.testedFact,sources:[],verificationSources:[],sourceLabel:"Hızlı AI üretimi ve yerel doğruluk denetimi",_planIndex:focus.planIndex}});
  }catch(error){throw real2026ContentError(error)}
}
async function generateRealMusic2026Exam(mode="screen"){
  const count=Math.round(+$("#real-2026-count").value),status=$("#real-2026-status"),button=$("#real-2026-generate"),printButton=$("#real-2026-print");
  if(!Number.isFinite(count)||count<5||count>100)return status.innerHTML='<div class="result">Soru sayısını 5 ile 100 arasında yaz.</div>';
  migrateReal2026History();store.set("real2026Count",count);button.disabled=true;printButton.disabled=true;
  const generationNo=+store.get("real2026GenerationNo",0),comparisonHistory=real2026ComparisonHistory(),jobs=buildReal2026Jobs(count,comparisonHistory,generationNo),savedDraft=store.get(REAL_2026_DRAFT_KEY,null),seedQuestions=savedDraft?.count===count&&savedDraft?.generationNo===generationNo&&Array.isArray(savedDraft.questions)?savedDraft.questions:[];let completed=seedQuestions.length;
  status.innerHTML=`<div class="result">${completed?`Kaydedilmiş taslaktan devam ediliyor · ${completed}/${count}`:`Hızlı üretim başlıyor · 0/${count}`}</div>`;
  try{
    const production=await runReal2026Jobs(jobs,count,comparisonHistory,generateReal2026Batch,event=>{completed=event.done;if(event.stage==="research")status.innerHTML=`<div class="result">AI soruları hazırlıyor · ${event.done}/${count}${event.job.count?` · sıradaki ${event.job.count} soru`:""}</div>`;if(event.stage==="accepted"){store.set(REAL_2026_DRAFT_KEY,{count,generationNo,questions:event.questions});status.innerHTML=`<div class="result">Sorular kaydedildi · ${event.done}/${count}</div>`}if(event.stage==="split")status.innerHTML=`<div class="result">Eksik paket küçültüldü; kaydedilen ${event.done} soru korunarak devam ediliyor · ${event.done}/${count}</div>`;if(event.stage==="reassigned")status.innerHTML=`<div class="result">Tekrar eden soru atlandı; farklı konu seçildi · ${event.done}/${count}</div>`},REAL_2026_WORKERS,seedQuestions),questions=production.questions;completed=production.done;
    const finalAudit=REAL_2026_QUALITY.auditNovelty(questions,comparisonHistory);
    if(!finalAudit.ok)throw new Error(`Son çeşitlilik denetimi geçmedi: ${finalAudit.duplicates[0].reason}`);
    const balanced=REAL_2026_QUALITY.balanceAnswers(questions,(generationNo+1)*100003+Date.now()%100000),ordered=shuffle(balanced),title=`2026 Gerçek Müzik Sınavı Tarzı · ${count} Soru`;
    rememberReal2026Questions(ordered,generationNo+1);store.set("real2026GenerationNo",generationNo+1);store.set(REAL_2026_DRAFT_KEY,null);
    if(mode==="print"){
      status.innerHTML='<div class="result">Sorular tamamlandı. A4 PDF ve ayrı cevap anahtarı hazırlanıyor…</div>';
      await savePrintableExamPdf(title,ordered);
      status.innerHTML=`<div class="result"><b>${count} soruluk yazdırılabilir deneme hazır.</b> PDF'yi açıp Yazdır seçeneğiyle gerçek kalemle çözebilirsin.</div>`;
      button.disabled=false;printButton.disabled=false;
    }else startExam(ordered,title);
  }catch(error){completed=Number.isFinite(error?.completed)?error.completed:completed;if(Array.isArray(error?.questions)&&error.questions.length)store.set(REAL_2026_DRAFT_KEY,{count,generationNo,questions:error.questions});status.innerHTML=`<div class="result"><b>${completed}/${count} soru kaydedildi.</b> Hiçbiri silinmedi. Hata: ${esc(error.message)} Düğmeye yeniden bastığında yalnız eksik sorulardan devam edecek.</div>`;button.disabled=false;printButton.disabled=false}
}
function renderMusicQuestionGenerator(){
  const savedArea=store.get("musicAiArea",MUSIC_AI_AREAS[0]),savedCount=+store.get("musicAiCount",10),savedLevel=store.get("musicAiLevel","Orta");
  setTitle("AI Müzik Soru Oluşturucu","Güvenilir internet kaynaklarıyla",true);
  app.innerHTML=`<section class="hero music-ai-hero"><h2>Bütün müzik alanlarından soru üret</h2><p>Seçtiğin konu önce güvenilir kaynaklardan araştırılır; bilgiler üniversite, konservatuvar, resmî kurum ve saygın müzik başvuru kaynaklarıyla doğrulanır.</p></section>
  <label>Alan</label><select id="music-ai-area">${MUSIC_AI_AREAS.map(area=>`<option ${area===savedArea?"selected":""}>${esc(area)}</option>`).join("")}</select>
  <div class="ai-control-grid"><div><label>Soru sayısı</label><select id="music-ai-count">${[5,10,15,20,25].map(n=>`<option value="${n}" ${n===savedCount?"selected":""}>${n}</option>`).join("")}</select></div>
  <div><label>Zorluk</label><select id="music-ai-level">${["Kolay","Orta","Zor"].map(level=>`<option ${level===savedLevel?"selected":""}>${level}</option>`).join("")}</select></div></div>
  <label class="check-row web-confirm"><input id="music-ai-source-check" type="checkbox" checked disabled><span>İnternetten araştır ve en az iki güvenilir kaynakla doğrula</span></label>
  <p class="muted source-priority">Kaynak önceliği: üniversite ve konservatuvar yayınları, Kültür ve Turizm Bakanlığı, Devlet Opera ve Balesi, orkestralar, müzeler ve güvenilir müzik ansiklopedileri.</p>
  <div class="actions"><button class="primary" id="music-ai-generate">Soruları Araştır ve Oluştur</button></div><div id="music-ai-status"></div>`;
  $("#music-ai-generate").onclick=generateMusicAiExam;
}
async function generateMusicAiExam(){
  const area=$("#music-ai-area").value,count=+$("#music-ai-count").value,level=$("#music-ai-level").value,status=$("#music-ai-status"),button=$("#music-ai-generate");
  store.set("musicAiArea",area);store.set("musicAiCount",count);store.set("musicAiLevel",level);
  status.innerHTML='<div class="result">Üniversite ve güvenilir kurum kaynakları araştırılıyor; sorular çapraz doğrulanıyor…</div>';
  button.disabled=true;
  const prompt=`${area} alanında, müzik öğretmenliği yazılı sınavına uygun ${level} düzeyde ${count} özgün dört seçenekli soru hazırla.

Zorunlu araştırma ve doğrulama:
- Her olguyu internetten araştır. Üniversitelerin müzik bölümleri/konservatuvarları, akademik veya resmî kurum yayınları ve güvenilir müzik ansiklopedilerini önceliklendir.
- Türk müziğinde mümkünse İTÜ Türk Musikisi Devlet Konservatuvarı, devlet konservatuvarları, Kültür ve Turizm Bakanlığı, TRT ve akademik yayınları kullan.
- Batı müziğinde üniversite/konservatuvar ders materyalleri, besteci veya kurum arşivleri, opera-orkestra-müze kaynakları ve güvenilir ansiklopediler kullan.
- Her sorunun bilgisini en az iki bağımsız güvenilir kaynakla karşılaştır. Kaynaklar uyuşmuyorsa o bilgiden soru üretme.
- Blog, forum, sosyal medya, reklam amaçlı test sitesi ve kaynaksız soru bankası kullanma.

Soru kuralları:
- Tek ve tartışmasız doğru cevap olsun. Çeldiriciler aynı türden ve makul olsun.
- Ezbere değmeyecek aşırı ayrıntı, kesin gün/ay, tartışmalı ilkler ve belirsiz atıflar sorma.
- Türkçe yazım ve özel adları kontrol et.
- "Tüm Müzik Alanları" seçildiyse soruları dönemler, Türk müziği, çalgılar, teori/formlar ve sahne müziğine dengeli dağıt.
- Açıklamada doğru cevabın nedenini 1-2 cümleyle belirt.

Yalnızca şu JSON yapısını döndür:
{"questions":[{"question":"...","choices":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"...","infoSources":[{"name":"kurum/yayın ve sayfa adı","url":"https://dogrudan-sayfa-adresi"}]}]}`;
  const instructions="Sen müzikoloji ve müzik eğitimi alanında titiz bir sınav editörüsün. Web araştırması yap, üniversite ve birincil kurum kaynaklarına öncelik ver, yalnız doğrulanmış bilgiyle Türkçe test soruları yaz. Her soru için gerçekten açıp kullandığın kaynakların adını ve doğrudan sayfa URL'sini infoSources alanında ver; URL uydurma. Çıktıda JSON dışında hiçbir metin kullanma.";
  try{
    const text=await openAIWebText(prompt,instructions,{maxOutputTokens:Math.max(2200,count*360),jsonSchema:musicQuestionSchema(count),schemaName:"music_exam_questions"});
    const parsed=parseJsonResponse(text);
    if(!Array.isArray(parsed.questions)||parsed.questions.length!==count)throw new Error(`AI ${count} yerine ${parsed.questions?.length||0} geçerli soru üretti. Yeniden dene.`);
    const qs=parsed.questions.map((q,i)=>{
      const choices=q.choices||{},answer=String(q.answer||"").toUpperCase();
      if(!q.question||Object.keys(choices).length!==4||!choices[answer])throw new Error(`${i+1}. sorunun yapısı eksik geldi.`);
      const sources=Array.isArray(q.infoSources)?q.infoSources.map(source=>({name:String(source?.name||"").trim(),url:safeHttpUrl(source?.url)})).filter(source=>source.name&&source.url).slice(0,3):[];
      if(!sources.length)throw new Error(`${i+1}. soruda doğrulanabilir kaynak bağlantısı bulunamadı.`);
      return {id:`music_ai_${Date.now()}_${i}`,question:q.question,choices,answer,explanation:q.explanation||"",sources,area:`AI Müzik · ${area}`};
    });
    startExam(qs,`AI Müzik · ${area}`);
  }catch(error){
    status.innerHTML=`<div class="result">Hata: ${esc(error.message)}</div>`;
    button.disabled=false;
  }
}
function renderOperaBallet(){
  setTitle("AI Opera ve Bale","İnternet destekli soru çözümü",true);
  app.innerHTML=`<section class="hero opera-ballet-hero"><h2>Yalnızca Opera ve Bale</h2><p>Temel sınav bilgilerine odaklanır: eser, besteci ve müzik dönemi. Gereksiz ayrıntı sormaz.</p></section>
  <div class="ai-control-grid"><div><label>Alan</label><select id="ob-area"><option>Opera ve Bale Karışık</option><option>Yalnızca Opera</option><option>Yalnızca Bale</option></select></div><div><label>Zorluk</label><select id="ob-level"><option>Kolay</option><option selected>Orta</option><option>Zor</option></select></div></div>
  <label>Soru sayısı</label><select id="ob-count"><option>5</option><option selected>10</option><option>15</option><option>20</option></select>
  <label class="check-row web-confirm"><input id="ob-web" type="checkbox"><span>İnternetten ayrıca doğrula (daha yavaş).</span></label>
  <div class="actions"><button class="primary" id="ob-generate">Soruları Hazırla</button></div><div id="ob-status"></div>`;
  $("#ob-generate").onclick=generateOperaBalletExam;
}
async function generateOperaBalletExam(){
  const area=$("#ob-area").value,level=$("#ob-level").value,count=+$("#ob-count").value,useWeb=$("#ob-web").checked,status=$("#ob-status");
  status.innerHTML=`<div class="result">${useWeb?"İnternet kaynakları araştırılıyor ve sorular doğrulanıyor…":"Sorular hazırlanıyor…"}</div>`;$("#ob-generate").disabled=true;
  const prompt=`${area} alanında ${level} düzeyde ${count} özgün, dört seçenekli kısa soru üret. En az %80 eser-besteci, eser-dönem veya besteci-dönem sorusu olsun. Kalanı yalnız temel terim/tür/ulusal okul olabilir. Nadir eser, librettist, kesin prömiyer, ayrıntılı karakter, olay örgüsü ve koreograf sorma. Tek kesin cevap ve tek cümle açıklama kullan. Yalnızca JSON döndür: {"questions":[{"question":"...","choices":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"..."}]}`;
  const instructions="Sade müzik öğretmenliği testi yaz. Eser, besteci ve dönem bilgisine odaklan. Tartışmalı bilgi kullanma. Yalnızca JSON döndür.";
  try{
    const maxOutputTokens=Math.max(1200,count*230);
    const text=useWeb?await openAIWebText(prompt,instructions,{maxOutputTokens}):await openAIText(prompt,instructions,{maxOutputTokens}),parsed=parseJsonResponse(text);
    if(!Array.isArray(parsed.questions)||!parsed.questions.length)throw new Error("Soru listesi boş geldi.");
    const qs=parsed.questions.map((q,i)=>({id:`ob_${Date.now()}_${i}`,...q}));
    startExam(qs,area);
  }catch(e){status.innerHTML=`<div class="result">Hata: ${esc(e.message)}</div>`;$("#ob-generate").disabled=false}
}
function wrongContext(){
  const qs=[...savedWrongQuestions("wrongMusicQuestions"),...savedWrongQuestions("wrongEducationQuestions")].slice(0,15);
  return qs.length?qs.map((q,i)=>`${i+1}. ${q.question} | Doğru: ${q.answer}) ${q.choices[q.answer]}`).join("\n"):"Kayıtlı yanlış soru yok.";
}
function renderAiStudyCenter(){
  const mode=store.get("aiMode","AI Öğretmen"),model=store.get("aiModel","gpt-5-mini");
  setTitle("AI Destekli Çalışma Merkezi",`${mode} · ${model}`,true);
  app.innerHTML=`<section class="hero ai-center-hero"><h2>AI Destekli Çalışma Merkezi</h2><p>Çalışma biçimini ve kullanmak istediğin AI modelini seç.</p></section>
  <div class="ai-control-grid"><div><label>Çalışma modu</label><select id="study-mode">${Object.keys(AI_MODES).map(x=>`<option ${x===mode?"selected":""}>${x}</option>`).join("")}<option ${mode==="AI Deneme Sınavı"?"selected":""}>AI Deneme Sınavı</option><option ${mode==="AI Sesli Öğretmen"?"selected":""}>AI Sesli Öğretmen</option></select></div><div><label>AI modeli</label><select id="study-model">${modelOptions(model)}</select></div></div>
  <div class="quick-prompts"><button data-prompt="Bu konuyu sınav odaklı öğret: ">Konu Anlat</button><button data-prompt="Bana birer birer soru sor ve cevaplarımı değerlendir. Konu: ">Soru-Cevap</button><button data-prompt="Bu konuda kısa özet ve ezber tekniği hazırla: ">Özet + Ezber</button></div>
  <div id="study-chat">${state.studyChat.map(m=>`<div class="message ${m.role}"><b>${m.role==="me"?"Sen":"AI"}:</b> ${esc(m.text)}</div>`).join("")}</div>
  <div class="chat-box study-compose"><textarea id="study-input" placeholder="Örn. Olumsuz pekiştirmeyi örneklerle öğret"></textarea><button class="primary" id="study-send">Gönder</button></div>
  <div class="actions"><button class="secondary" id="voice-teacher">AI Sesli Öğretmen</button><button class="secondary" id="clear-study-chat">Sohbeti Temizle</button></div>`;
  $("#study-mode").onchange=e=>{store.set("aiMode",e.target.value);if(e.target.value==="AI Sesli Öğretmen")renderVoice()};
  $("#study-model").onchange=e=>{store.set("aiModel",e.target.value);setTitle("AI Destekli Çalışma Merkezi",`${$("#study-mode").value} · ${e.target.value}`,true)};
  document.querySelectorAll("[data-prompt]").forEach(b=>b.onclick=()=>{$("#study-input").value=b.dataset.prompt;$("#study-input").focus()});
  $("#voice-teacher").onclick=renderVoice;
  $("#clear-study-chat").onclick=()=>{state.studyChat=[];renderAiStudyCenter()};
  $("#study-send").onclick=sendStudyRequest;
}
async function sendStudyRequest(){
  const input=$("#study-input").value.trim(),mode=$("#study-mode").value;if(!input)return toast("Çalışmak istediğin konuyu veya soruyu yaz.");
  store.set("aiMode",mode);store.set("aiModel",$("#study-model").value);
  if(mode==="AI Sesli Öğretmen")return renderVoice();
  state.studyChat.push({role:"me",text:input});renderAiStudyCenter();
  const chat=$("#study-chat");chat.insertAdjacentHTML("beforeend",'<div class="message ai">Yanıt hazırlanıyor…</div>');
  const base="Sen KKTC/Türkiye müzik öğretmenliği ve Eğitim Bilimleri sınavına hazırlanan kullanıcıya destek veren uzman bir öğretmensin. Türkçe konuş, bilmediğin bilgiyi uydurma.";
  const local=mode==="Yanlış Analizi"?`\n\nKullanıcının kayıtlı yanlışları:\n${wrongContext()}`:"";
  try{
    const answer=await openAIText(input,`${base}\n\nGörev: ${AI_MODES[mode]||AI_MODES["Serbest Soru"]}${local}`);
    state.studyChat.push({role:"ai",text:answer});renderAiStudyCenter();
  }catch(e){state.studyChat.push({role:"ai",text:`Hata: ${e.message}`});renderAiStudyCenter()}
}
function renderTeacher(){
  setTitle("AI Öğretmen","Yazılı çalışma",true);app.innerHTML=`<section class="hero"><h2>AI Öğretmen</h2><p>Konu sorabilir, açıklama isteyebilir veya “bana bir soru sor” diyebilirsin.</p></section><div id="chat">${state.chat.map(m=>`<div class="message ${m.role}"><b>${m.role==="me"?"Sen":"Öğretmen"}:</b> ${esc(m.text)}</div>`).join("")}</div><div class="chat-box"><textarea id="teacher-input" placeholder="Örn. Olumsuz pekiştirmeyi kısa örnekle anlat"></textarea><button class="primary" id="send-teacher">Gönder</button></div>`;
  $("#send-teacher").onclick=async()=>{const t=$("#teacher-input").value.trim();if(!t)return;state.chat.push({role:"me",text:t});renderTeacher();const box=$("#chat");box.insertAdjacentHTML("beforeend",'<div class="message ai">Yanıt hazırlanıyor…</div>');try{const answer=await openAIText(t);state.chat.push({role:"ai",text:answer});renderTeacher()}catch(e){toast(e.message)}};
}
async function renderAiExam(){
  setTitle("AI Eğitim Bilimleri","AI denemesi oluştur",true);app.innerHTML=`<section class="hero education-hero"><h2>Eğitim Bilimleri Denemesi</h2><p>KHK 2025 ve KPSS düzeyinde; vaka, öncüllü, karşılaştırmalı, olumsuz köklü, uygulama ve veri yorumlama sorularını karışık oluşturur. Her soruda doğrulama kaynağı gösterilir.</p></section><label>Alan</label><select id="ai-area"><option>Tüm alanlar</option>${EDUCATION_AREAS.map(x=>`<option>${x}</option>`).join("")}</select><div class="ai-control-grid"><div><label>Soru sayısı</label><select id="ai-count"><option>5</option><option>10</option><option>15</option><option selected>21</option><option>35</option></select></div><div><label>Zorluk</label><select id="ai-level"><option>Kolay</option><option selected>Orta</option><option>Zor</option></select></div></div><div class="actions"><button class="primary" id="generate">Deneme Oluştur</button><button class="secondary" id="education-home">Eğitim Bilimleri Merkezi</button></div><div id="ai-status"></div>`;
  $("#generate").onclick=generateAiExam;
  $("#education-home").onclick=renderEducationCenter;
}
async function generateAiExam(){
  const area=$("#ai-area").value,count=+$("#ai-count").value,level=$("#ai-level").value;
  const groups=area==="Tüm alanlar"?EDUCATION_AREAS.map((x,i)=>({area:x,count:Math.floor(count/7)+(i<count%7?1:0)})).filter(x=>x.count):[{area,count}];
  await generateEducationQuestions(groups,`${level} KPSS/KHK düzeyi; bağlamlı uygulama ve yorum soruları çoğunlukta, güçlü çeldiricili, yüzeysel olmayan sınav soruları`,"AI Eğitim Bilimleri","#ai-status","#generate");
}
function renderVoice(){
  const live=!!state.rtc;setTitle("Realtime AI Voice","Canlı konuşma",false);
  app.innerHTML=`<section class="hero"><h2>AI ile kesintisiz konuş</h2><p>Mikrofon açık kalır, AI anında sesli yanıt verir. AI konuşurken araya girip sözünü kesebilirsin.</p></section>
  <div class="voice-orb ${live?"live":""}">◉</div><div class="actions center"><button class="${live?"danger":"primary"}" id="voice-toggle">${live?"Canlı Görüşmeyi Bitir":"Canlı Görüşmeyi Başlat"}</button></div>
  <div id="voice-status" class="result">${live?"Bağlı · Konuşabilirsin.":"Hazır · Başlat düğmesine dokun."}</div><div id="transcript"></div>`;
  $("#voice-toggle").onclick=live?stopRealtimeVoice:startRealtimeVoice;
}
async function startRealtimeVoice(){
  const key=store.get("apiKey",""),endpoint=store.get("realtimeEndpoint","");
  if(!key&&!endpoint)return toast("Önce Ayarlar bölümüne API anahtarı veya Realtime sunucu adresi gir.");
  const status=$("#voice-status");status.textContent="Mikrofon ve canlı bağlantı hazırlanıyor…";
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("Bu cihaz WebRTC mikrofon erişimini desteklemiyor.");
    const pc=new RTCPeerConnection();state.rtc=pc;
    const audio=document.createElement("audio");audio.autoplay=true;audio.setAttribute("playsinline","");state.voiceAudio=audio;
    pc.ontrack=e=>{audio.srcObject=e.streams[0];audio.play().catch(()=>{})};
    pc.onconnectionstatechange=()=>{
      const el=$("#voice-status");if(!el)return;
      if(pc.connectionState==="connected")el.textContent="Bağlı · Konuşabilirsin.";
      if(["failed","disconnected"].includes(pc.connectionState))el.textContent="Canlı bağlantı kesildi.";
    };
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    state.voiceStream=stream;stream.getAudioTracks().forEach(track=>pc.addTrack(track,stream));
    const dc=pc.createDataChannel("oai-events");state.voiceChannel=dc;
    dc.onopen=()=>dc.send(JSON.stringify({type:"session.update",session:{
      type:"realtime",model:"gpt-realtime-2.1",output_modalities:["audio"],
      instructions:store.get("instructions","Türkçe konuş. Kısa, doğru ve öğretici bir sınav hocası ol. Kullanıcı isterse birer birer sözlü soru sor."),
      audio:{input:{transcription:{model:"gpt-4o-mini-transcribe",language:"tr"},turn_detection:{type:"server_vad",create_response:true,interrupt_response:true}},output:{voice:"marin"}}
    }}));
    dc.onmessage=e=>{try{handleRealtimeEvent(JSON.parse(e.data))}catch{}};
    dc.onerror=()=>{const el=$("#voice-status");if(el)el.textContent="Realtime veri bağlantısında hata oluştu."};
    const offer=await pc.createOffer();await pc.setLocalDescription(offer);
    const target=endpoint||"https://api.openai.com/v1/realtime/calls";
    const headers={"Content-Type":"application/sdp"};if(!endpoint)headers.Authorization=`Bearer ${key}`;
    const res=await fetch(target,{method:"POST",headers,body:offer.sdp});
    if(!res.ok)throw new Error((await res.text())||`HTTP ${res.status}`);
    await pc.setRemoteDescription({type:"answer",sdp:await res.text()});renderVoice();
  }catch(e){
    stopRealtimeVoice(false);
    const denied=e?.name==="NotAllowedError"||/permission|izin|denied/i.test(e?.message||"");
    renderVoice();const el=$("#voice-status");
    if(el)el.textContent=denied?"Mikrofon izni reddedildi. Android uygulama izinlerinden Mikrofonu aç.":`Bağlantı kurulamadı: ${e?.message||"Bilinmeyen hata"}`;
  }
}
function handleRealtimeEvent(e){
  const tr=$("#transcript");if(!tr)return;
  let who="",text="";
  if(e.type==="conversation.item.input_audio_transcription.completed"){who="me";text=e.transcript}
  if(e.type==="response.output_audio_transcript.done"||e.type==="response.audio_transcript.done"){who="ai";text=e.transcript}
  if(e.type==="error"){const s=$("#voice-status");if(s)s.textContent=`Realtime hatası: ${e.error?.message||"Bilinmeyen hata"}`}
  if(text){tr.insertAdjacentHTML("beforeend",`<div class="message ${who}"><b>${who==="me"?"Sen":"AI"}:</b> ${esc(text)}</div>`);tr.scrollTop=tr.scrollHeight}
}
function stopRealtimeVoice(redraw=true){
  state.voiceStream?.getTracks().forEach(t=>t.stop());state.voiceChannel?.close();state.rtc?.close();
  if(state.voiceAudio){state.voiceAudio.pause();state.voiceAudio.srcObject=null}
  state.rtc=null;state.voiceStream=null;state.voiceAudio=null;state.voiceChannel=null;if(redraw)renderVoice();
}
function migrateWrongQuestions(){
  if(store.get("v24_4l_wrong_split",false))return;
  const old=ids("wrongQuestions");
  allQuestions().filter(q=>old.has(q.id)).forEach(saveWrongQuestion);
  store.set("wrongQuestions",[]);
  store.set("v24_4l_wrong_split",true);
}

function removeEfsaneRecords(){
  if(store.get("v24_4m_efsane_removed",false))return;
  const isEfsane=q=>String(q?.id||"").startsWith("efsane-");
  store.set("wrongEducationQuestions",savedWrongQuestions("wrongEducationQuestions").filter(q=>!isEfsane(q)));
  store.set("hardQuestions",store.get("hardQuestions",[]).filter(id=>!String(id).startsWith("efsane-")));
  store.set("hardQuestionItems",store.get("hardQuestionItems",[]).filter(q=>!isEfsane(q)));
  store.set("v24_4m_efsane_removed",true);
}

$("#back").onclick=()=>nav("home");$("#settings").onclick=()=>renderSettings();
document.querySelectorAll("#bottom-nav button").forEach(b=>b.onclick=()=>nav(b.dataset.route));
Promise.all([
  fetch("questions.json").then(r=>{if(!r.ok)throw new Error("Müzik soru bankası bulunamadı.");return r.json()}),
  fetch("education-questions.json").then(r=>{if(!r.ok)throw new Error("Eğitim Bilimleri soru bankası bulunamadı.");return r.json()})
]).then(([music,education])=>{state.data=music;state.educationData=education;migrateWrongQuestions();removeEfsaneRecords();nav("home")})
  .catch(e=>app.innerHTML=`<div class="result">Soru bankası yüklenemedi: ${esc(e.message)}</div>`);
