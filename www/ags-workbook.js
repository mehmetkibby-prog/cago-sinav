window.EBWorkbook = (() => {
  const DATA_URL = "ags-workbook.json";
  const PROGRESS_KEY = "agsEducationWorkbookProgressV1";
  const ui = {
    data: null,
    tab: "study",
    subject: "all",
    query: "",
    activeResourceId: "",
    activeTestId: "",
    testIndex: 0,
    readerMode: "text",
    viewerPage: 1,
    pageZoom: false,
    showTestPage: false,
    questionStartedAt: Date.now(),
    sessionQuestionIds: [],
    sessionTitle: "",
  };

  const readProgress = () => store.get(PROGRESS_KEY, { lessons: {}, answers: {}, tests: {} });
  const writeProgress = progress => store.set(PROGRESS_KEY, progress);
  const subjects = () => ui.data?.subjects || [];
  const resources = () => subjects().flatMap(subject => subject.resources.map(resource => ({ subject, resource })));
  const tests = () => resources().filter(item => item.resource.type === "test");
  const questions = () => tests().flatMap(item => item.resource.questions);
  const byId = id => resources().find(item => item.resource.id === id);
  const testById = id => tests().find(item => item.resource.id === id);
  const clean = value => String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

  async function load() {
    if (ui.data) return ui.data;
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error("Çalışma yaprakları verisi bulunamadı.");
    const data = await response.json();
    const stats = data?.stats || {};
    if (stats.physicalPages !== 40 || stats.lessonSheets !== 12 || stats.tests !== 12 || stats.questions !== 81 || stats.officialSolutions !== 81) {
      throw new Error("Çalışma yaprakları eksiksizlik denetiminden geçemedi.");
    }
    ui.data = data;
    return data;
  }

  function progressSummary() {
    const progress = readProgress();
    const lessonIds = new Set(resources().filter(item => item.resource.type === "lesson").map(item => item.resource.id));
    const questionIds = new Set(questions().map(question => question.id));
    const completedLessons = Object.keys(progress.lessons || {}).filter(id => lessonIds.has(id) && progress.lessons[id]).length;
    const answered = Object.entries(progress.answers || {}).filter(([id]) => questionIds.has(id));
    const correct = answered.filter(([, answer]) => answer.ok).length;
    const totalUnits = lessonIds.size + questionIds.size;
    const completedUnits = completedLessons + answered.length;
    return {
      completedLessons,
      answered: answered.length,
      correct,
      totalUnits,
      percent: totalUnits ? Math.round(completedUnits / totalUnits * 100) : 0,
    };
  }

  function heroHtml() {
    const stats = ui.data.stats;
    const progress = progressSummary();
    return `<section class="ags-workbook-hero">
      <div class="ags-workbook-hero-copy">
        <small>TEK SAYFALIK EĞİTİM BİLİMLERİ MERKEZİ</small>
        <h2>MEB-AGS Eğitim Bilimleri Çalışma Yaprakları</h2>
        <p>Konu anlatımları, bütün testler, resmî QR çözümleri ve belgenin birebir ${stats.physicalPages} sayfası çevrimdışı olarak aynı çalışma alanında.</p>
      </div>
      <div class="ags-workbook-metrics">
        <article><b>${stats.subjects}</b><span>alan</span></article>
        <article><b>${stats.lessonSheets}</b><span>konu yaprağı</span></article>
        <article><b>${stats.tests}</b><span>test</span></article>
        <article><b>${stats.questions}</b><span>soru + çözüm</span></article>
        <article class="ags-progress-metric"><b>%${progress.percent}</b><span>tamamlandı</span></article>
      </div>
      <div class="ags-overall-progress" aria-label="Genel ilerleme"><i style="width:${progress.percent}%"></i></div>
    </section>`;
  }

  function toolbarHtml() {
    return `<section class="ags-workbook-toolbar">
      <div class="ags-workbook-tabs" role="tablist" aria-label="Çalışma yaprakları görünümleri">
        <button data-ags-tab="study" class="${ui.tab === "study" ? "active" : ""}">📚 Çalışma Akışı</button>
        <button data-ags-tab="tests" class="${ui.tab === "tests" ? "active" : ""}">✓ Testleri Çöz</button>
        <button data-ags-tab="pages" class="${ui.tab === "pages" ? "active" : ""}">▤ Orijinal 40 Sayfa</button>
      </div>
      <label class="ags-search"><span>⌕</span><input id="ags-search-input" type="search" value="${esc(ui.query)}" placeholder="Kavram, soru veya çözüm ara…" autocomplete="off"></label>
      <div class="ags-subject-chips" aria-label="Alan filtresi">
        <button data-ags-subject="all" class="${ui.subject === "all" ? "active" : ""}">Tümü</button>
        ${subjects().map(subject => `<button data-ags-subject="${subject.id}" class="${ui.subject === subject.id ? "active" : ""}">${esc(subject.shortTitle || subject.title)}</button>`).join("")}
      </div>
    </section>`;
  }

  function render() {
    setTitle("AGS Eğitim Bilimleri Kitabı", "40 sayfa · 81 soru · 81 resmî çözüm", true);
    app.innerHTML = `<div class="ags-workbook-page"><div class="ags-loading-card">Çalışma yaprakları hazırlanıyor…</div></div>`;
    load().then(draw).catch(error => {
      app.innerHTML = `<div class="result"><b>Çalışma yaprakları açılamadı.</b><br>${esc(error.message)}</div>`;
    });
  }

  function draw() {
    app.innerHTML = `<div class="ags-workbook-page">${heroHtml()}${toolbarHtml()}<main id="ags-workbook-body">${bodyHtml()}</main></div>`;
    bindToolbar();
    bindBody();
  }

  function refreshBody() {
    const body = document.querySelector("#ags-workbook-body");
    if (!body) return draw();
    body.innerHTML = bodyHtml();
    bindBody();
    const metric = document.querySelector(".ags-progress-metric");
    const bar = document.querySelector(".ags-overall-progress i");
    const summary = progressSummary();
    if (metric) metric.innerHTML = `<b>%${summary.percent}</b><span>tamamlandı</span>`;
    if (bar) bar.style.width = `${summary.percent}%`;
  }

  function bindToolbar() {
    document.querySelectorAll("[data-ags-tab]").forEach(button => button.onclick = () => {
      ui.tab = button.dataset.agsTab;
      ui.activeResourceId = "";
      ui.activeTestId = "";
      ui.showTestPage = false;
      ui.query = "";
      draw();
    });
    document.querySelectorAll("[data-ags-subject]").forEach(button => button.onclick = () => {
      ui.subject = button.dataset.agsSubject;
      ui.activeResourceId = "";
      ui.activeTestId = "";
      draw();
    });
    const search = document.querySelector("#ags-search-input");
    if (search) search.oninput = event => {
      ui.query = event.target.value;
      ui.activeResourceId = "";
      ui.activeTestId = "";
      refreshBody();
    };
  }

  function bodyHtml() {
    if (ui.query.trim()) return searchResultsHtml();
    if (ui.activeTestId) return testPlayerHtml();
    if (ui.activeResourceId) return lessonReaderHtml();
    if (ui.tab === "tests") return testsHtml();
    if (ui.tab === "pages") return pagesHtml();
    return studyHtml();
  }

  function filteredSubjects() {
    return subjects().filter(subject => ui.subject === "all" || subject.id === ui.subject);
  }

  function resourceProgress(resource) {
    const progress = readProgress();
    if (resource.type === "lesson") return progress.lessons?.[resource.id] ? { label: "Tamamlandı", percent: 100, done: true } : { label: "Okunmadı", percent: 0, done: false };
    const answered = resource.questions.filter(question => progress.answers?.[question.id]).length;
    return { label: `${answered}/${resource.questions.length} soru`, percent: Math.round(answered / resource.questions.length * 100), done: answered === resource.questions.length };
  }

  function studyHtml() {
    return `<div class="ags-section-stack">${filteredSubjects().map(subject => {
      const lessonCount = subject.resources.filter(resource => resource.type === "lesson").length;
      const questionCount = subject.resources.filter(resource => resource.type === "test").reduce((sum, resource) => sum + resource.questions.length, 0);
      return `<section class="ags-subject-card">
        <header>
          <img src="ags-workbook-pages/page-${String(subject.coverPage).padStart(2, "0")}.webp" alt="${esc(subject.title)} bölüm kapağı" loading="lazy">
          <div><small>${lessonCount} KONU YAPRAĞI · ${questionCount} SORU</small><h3>${esc(subject.title)}</h3><p>PDF sırasına göre konu anlatımı ve hemen ardından testi.</p></div>
        </header>
        <div class="ags-resource-grid">${subject.resources.map(resource => {
          const status = resourceProgress(resource);
          return `<button class="ags-resource-card ${resource.type} ${status.done ? "done" : ""}" data-ags-resource="${resource.id}">
            <span class="ags-resource-icon">${resource.type === "lesson" ? "📖" : "✓"}</span>
            <span><small>${resource.type === "lesson" ? "KONU ANLATIMI" : `TEST ${resource.testNumber}`} · PDF s. ${resource.physicalPage}</small><b>${esc(resource.title)}</b><em>${status.label}</em></span>
            <i><u style="width:${status.percent}%"></u></i>
          </button>`;
        }).join("")}</div>
      </section>`;
    }).join("")}</div>`;
  }

  function testsHtml() {
    const progress = readProgress();
    const allQuestions = questions();
    const unanswered = allQuestions.filter(question => !progress.answers?.[question.id]);
    return `<section class="ags-test-library-head">
      <div><small>PDF’DEKİ BÜTÜN TESTLER</small><h3>81 soru, 81 resmî ayrıntılı çözüm</h3><p>Cevapların cihazda saklanır; yanlışların uygulamanın Eğitim Bilimleri yanlışlarına da eklenir.</p></div>
      <div class="ags-test-library-actions"><button class="primary" data-ags-start-test="all-tests">81 Soruyu Tek Denemede Çöz</button>${unanswered.length ? `<button class="secondary" data-ags-start-test="unanswered">Kalan ${unanswered.length} Soruyu Çöz</button>` : ""}</div>
    </section>
    <div class="ags-test-grid">${tests().filter(({ subject }) => ui.subject === "all" || subject.id === ui.subject).map(({ subject, resource }) => {
      const status = resourceProgress(resource);
      const correct = resource.questions.filter(question => progress.answers?.[question.id]?.ok).length;
      return `<article class="ags-test-card ${status.done ? "done" : ""}">
        <small>${esc(subject.shortTitle || subject.title)} · PDF s. ${resource.physicalPage}</small>
        <h3>${esc(resource.title)}</h3>
        <p>${status.label}${status.percent ? ` · ${correct} doğru` : ""}</p>
        <i><u style="width:${status.percent}%"></u></i>
        <button class="${status.percent ? "secondary" : "primary"}" data-ags-start-test="${resource.id}">${status.percent ? "Devam Et" : "Teste Başla"}</button>
      </article>`;
    }).join("")}</div>`;
  }

  function currentTest() {
    if (ui.activeTestId === "all-tests") return { subject: null, resource: { id: "all-tests", title: "Tüm PDF Testleri", questions: questions(), physicalPage: null } };
    if (ui.activeTestId === "session") {
      const ids = new Set(ui.sessionQuestionIds);
      return { subject: null, resource: { id: "session", title: ui.sessionTitle || "Seçili Sorular", questions: questions().filter(question => ids.has(question.id)), physicalPage: null } };
    }
    return testById(ui.activeTestId);
  }

  function testPlayerHtml() {
    const current = currentTest();
    if (!current?.resource?.questions?.length) return `<section class="ags-empty"><h3>Bu listede çözülecek soru kalmadı.</h3><button class="primary" data-ags-back-tests>Testlere Dön</button></section>`;
    const { resource } = current;
    const progress = readProgress();
    ui.testIndex = Math.max(0, Math.min(ui.testIndex, resource.questions.length - 1));
    const question = resource.questions[ui.testIndex];
    const answer = progress.answers?.[question.id];
    const answeredCount = resource.questions.filter(item => progress.answers?.[item.id]).length;
    const correctCount = resource.questions.filter(item => progress.answers?.[item.id]?.ok).length;
    const complete = answeredCount === resource.questions.length;
    const physicalResource = resources().find(item => item.resource.questions?.some(itemQuestion => itemQuestion.id === question.id))?.resource;
    return `<section class="ags-test-player">
      <div class="ags-inline-back"><button class="secondary" data-ags-back-tests>← Test Listesi</button><button class="danger" data-ags-reset-test="${resource.id}">Testi Sıfırla</button></div>
      <header class="ags-test-player-head">
        <div><small>${complete ? "TEST TAMAMLANDI" : `SORU ${ui.testIndex + 1} / ${resource.questions.length}`}</small><h3>${esc(resource.title)}</h3><p>${answeredCount} cevap · ${correctCount} doğru</p></div>
        ${physicalResource ? `<button class="secondary" data-ags-toggle-test-page>${ui.showTestPage ? "Orijinal Sayfayı Gizle" : "Orijinal Test Sayfası"}</button>` : ""}
      </header>
      ${complete ? `<div class="ags-test-summary"><b>%${Math.round(correctCount / resource.questions.length * 100)}</b><span>${correctCount} doğru · ${resource.questions.length - correctCount} yanlış</span><button class="secondary" data-ags-start-test="wrong-only">Yanlışları Yeniden Çöz</button></div>` : ""}
      ${ui.showTestPage && physicalResource ? pageImageHtml(physicalResource.image, `${physicalResource.title} orijinal PDF sayfası`, false) : ""}
      <div class="ags-question-map">${resource.questions.map((item, index) => {
        const itemAnswer = progress.answers?.[item.id];
        return `<button data-ags-question-index="${index}" class="${index === ui.testIndex ? "current" : ""} ${itemAnswer ? (itemAnswer.ok ? "correct" : "wrong") : ""}">${index + 1}</button>`;
      }).join("")}</div>
      <div class="ags-question-progress"><i style="width:${Math.round(answeredCount / resource.questions.length * 100)}%"></i></div>
      <article class="ags-question-card">
        <small>${esc(question.educationArea)} · PDF s. ${question.physicalPage}</small>
        <h3>${esc(question.question)}</h3>
        <div class="ags-choice-list">${Object.entries(question.choices).map(([key, value]) => {
          const classes = answer ? (key === question.answer ? "correct" : key === answer.selected ? "wrong" : "muted") : "";
          return `<button data-ags-answer="${key}" class="${classes}" ${answer ? "disabled" : ""}><strong>${key}</strong><span>${esc(value)}</span></button>`;
        }).join("")}</div>
        ${answer ? `<div class="ags-answer-feedback ${answer.ok ? "correct" : "wrong"}"><b>${answer.ok ? "Doğru cevap" : `Yanlış. Doğru cevap ${question.answer}) ${esc(question.choices[question.answer])}`}</b><p>${esc(question.explanation)}</p><a href="${esc(question.officialSolutionUrl)}" target="_blank" rel="noopener noreferrer">Yayınevinin QR çözüm sayfasını aç ↗</a></div>` : `<p class="ags-answer-hint">Bir şık seçtiğinde doğru cevap ve QR kodundaki resmî ayrıntılı çözüm gösterilir.</p>`}
      </article>
      <div class="ags-test-nav"><button class="secondary" data-ags-test-prev ${ui.testIndex === 0 ? "disabled" : ""}>← Önceki</button><button class="primary" data-ags-test-next ${ui.testIndex === resource.questions.length - 1 ? "disabled" : ""}>Sonraki →</button></div>
    </section>`;
  }

  function lessonReaderHtml() {
    const item = byId(ui.activeResourceId);
    if (!item || item.resource.type !== "lesson") return studyHtml();
    const { subject, resource } = item;
    const done = Boolean(readProgress().lessons?.[resource.id]);
    return `<section class="ags-lesson-reader">
      <div class="ags-inline-back"><button class="secondary" data-ags-back-study>← Bölüm Listesi</button><button class="${done ? "secondary" : "primary"}" data-ags-complete-lesson="${resource.id}">${done ? "✓ Tamamlandı" : "Okudum, Tamamla"}</button></div>
      <header><div><small>${esc(subject.shortTitle || subject.title)} · PDF s. ${resource.physicalPage}</small><h3>${esc(resource.title)}</h3><p>Tablet için akıcı metin görünümü ile PDF’nin birebir sayfası arasında geçiş yapabilirsin.</p></div></header>
      <div class="ags-reader-switch"><button data-ags-reader-mode="text" class="${ui.readerMode === "text" ? "active" : ""}">Okuma Metni</button><button data-ags-reader-mode="page" class="${ui.readerMode === "page" ? "active" : ""}">Orijinal Sayfa</button></div>
      ${ui.readerMode === "page" ? pageImageHtml(resource.image, `${resource.title} orijinal PDF sayfası`, true) : `${lessonTextHtml(resource.text, `AGS Eğitim Bilimleri · ${subject.shortTitle || subject.title} · ${resource.title}`)}<p class="sentence-save-hint">📌 Kaydetmek istediğin cümleye basılı tutup seç; altta açılan “Cümleyi Kaydet” düğmesine dokun.</p>`}
    </section>`;
  }

  function lessonTextHtml(text, source) {
    return `<article class="ags-lesson-text selectable-study-text" data-save-source="${esc(source)}">${String(text || "").split(/\n\n+/).filter(Boolean).map(paragraph => {
      const letters = paragraph.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");
      const uppercase = letters && letters === letters.toLocaleUpperCase("tr-TR");
      if (uppercase && paragraph.length < 120) return `<h3>${esc(paragraph)}</h3>`;
      if (/^Not:/i.test(paragraph)) return `<aside>${esc(paragraph)}</aside>`;
      return `<p>${esc(paragraph)}</p>`;
    }).join("")}</article>`;
  }

  function pageImageHtml(src, alt, zoomable) {
    return `<div class="ags-page-frame ${ui.pageZoom && zoomable ? "zoomed" : ""}" ${zoomable ? "data-ags-page-zoom" : ""}><img src="${src}" alt="${esc(alt)}" loading="eager">${zoomable ? `<small>${ui.pageZoom ? "Normal boyuta dönmek için dokun" : "Yakınlaştırmak için sayfaya dokun"}</small>` : ""}</div>`;
  }

  function pagesHtml() {
    const page = ui.data.pages[Math.max(0, Math.min(ui.viewerPage - 1, ui.data.pages.length - 1))];
    const kindLabels = { "front-cover": "Ön kapak", contents: "İçindekiler", "section-cover": "Bölüm kapağı", blank: "Boş ayırıcı sayfa", lesson: "Konu anlatımı", test: "Test", "back-cover": "Arka kapak" };
    return `<section class="ags-page-viewer">
      <header><div><small>BELGENİN BİREBİR TAMAMI</small><h3>Orijinal PDF - Sayfa ${page.number} / 40</h3><p>${kindLabels[page.kind] || "PDF sayfası"}. Boş ayırıcı sayfalar dâhil 40 sayfanın tamamı korunmuştur.</p></div><a class="secondary ags-pdf-link" href="${ui.data.originalPdf}" target="_blank" rel="noopener">Orijinal PDF’yi Aç</a></header>
      <div class="ags-page-controls"><button data-ags-page-prev ${page.number === 1 ? "disabled" : ""}>←</button><select id="ags-page-select">${ui.data.pages.map(item => `<option value="${item.number}" ${item.number === page.number ? "selected" : ""}>Sayfa ${item.number} · ${kindLabels[item.kind] || "PDF"}</option>`).join("")}</select><button data-ags-page-next ${page.number === 40 ? "disabled" : ""}>→</button></div>
      ${pageImageHtml(page.image, `PDF sayfa ${page.number}`, true)}
      <div class="ags-page-strip">${ui.data.pages.map(item => `<button data-ags-page="${item.number}" class="${item.number === page.number ? "active" : ""} ${item.blank ? "blank" : ""}">${item.number}</button>`).join("")}</div>
    </section>`;
  }

  function snippet(text, query) {
    const source = String(text || "").replace(/\s+/g, " ").trim();
    const index = clean(source).indexOf(clean(query));
    if (index < 0) return source.slice(0, 190) + (source.length > 190 ? "…" : "");
    const start = Math.max(0, index - 70);
    const end = Math.min(source.length, index + query.length + 120);
    return `${start ? "…" : ""}${source.slice(start, end)}${end < source.length ? "…" : ""}`;
  }

  function searchResultsHtml() {
    const query = ui.query.trim();
    const needle = clean(query);
    const allowedSubjects = new Set(filteredSubjects().map(subject => subject.id));
    const results = [];
    resources().filter(item => allowedSubjects.has(item.subject.id)).forEach(({ subject, resource }) => {
      if (resource.type === "lesson") {
        const haystack = `${resource.title} ${resource.text}`;
        if (clean(haystack).includes(needle)) results.push({ type: "lesson", label: "Konu anlatımı", title: `${subject.shortTitle || subject.title} · ${resource.title}`, detail: snippet(resource.text, query), resourceId: resource.id });
      } else {
        resource.questions.forEach((question, index) => {
          const haystack = `${question.question} ${Object.values(question.choices).join(" ")} ${question.explanation}`;
          if (clean(haystack).includes(needle)) results.push({ type: "question", label: `${resource.title} · Soru ${question.number}`, title: question.question, detail: snippet(haystack, query), testId: resource.id, questionIndex: index });
        });
      }
    });
    ui.data.pages.forEach(page => {
      if (clean(page.text).includes(needle) && !results.some(result => result.type === "lesson" && result.resourceId && byId(result.resourceId)?.resource.physicalPage === page.number)) {
        results.push({ type: "page", label: `Orijinal sayfa ${page.number}`, title: `PDF sayfa ${page.number}`, detail: snippet(page.text, query), page: page.number });
      }
    });
    return `<section class="ags-search-results"><header><small>ARAMA SONUÇLARI</small><h3>“${esc(query)}” için ${results.length} eşleşme</h3><p>Konu metinleri, 81 soru, bütün şıklar, resmî çözümler ve 40 orijinal sayfa birlikte arandı.</p></header>${results.length ? `<div>${results.slice(0, 120).map((result, index) => `<button data-ags-search-result="${index}"><small>${esc(result.label)}</small><b>${esc(result.title)}</b><span>${esc(result.detail)}</span></button>`).join("")}</div>` : `<div class="ags-empty"><h3>Sonuç bulunamadı.</h3><p>Başka bir kavram veya daha kısa bir sözcük dene.</p></div>`}</section>`;
  }

  function searchResults() {
    const query = ui.query.trim();
    const needle = clean(query);
    const allowedSubjects = new Set(filteredSubjects().map(subject => subject.id));
    const results = [];
    resources().filter(item => allowedSubjects.has(item.subject.id)).forEach(({ subject, resource }) => {
      if (resource.type === "lesson") {
        if (clean(`${resource.title} ${resource.text}`).includes(needle)) results.push({ type: "lesson", resourceId: resource.id });
      } else resource.questions.forEach((question, index) => {
        if (clean(`${question.question} ${Object.values(question.choices).join(" ")} ${question.explanation}`).includes(needle)) results.push({ type: "question", testId: resource.id, questionIndex: index });
      });
    });
    ui.data.pages.forEach(page => {
      if (clean(page.text).includes(needle) && !results.some(result => result.type === "lesson" && byId(result.resourceId)?.resource.physicalPage === page.number)) results.push({ type: "page", page: page.number });
    });
    return results;
  }

  function bindBody() {
    document.querySelectorAll("[data-ags-resource]").forEach(button => button.onclick = () => {
      const item = byId(button.dataset.agsResource);
      if (!item) return;
      if (item.resource.type === "test") startTest(item.resource.id);
      else {
        ui.activeResourceId = item.resource.id;
        ui.readerMode = "text";
        refreshBody();
      }
    });
    document.querySelectorAll("[data-ags-start-test]").forEach(button => button.onclick = () => startTest(button.dataset.agsStartTest));
    document.querySelectorAll("[data-ags-back-study]").forEach(button => button.onclick = () => { ui.activeResourceId = ""; ui.pageZoom = false; refreshBody(); });
    document.querySelectorAll("[data-ags-back-tests]").forEach(button => button.onclick = () => { ui.activeTestId = ""; ui.showTestPage = false; ui.tab = "tests"; draw(); });
    document.querySelectorAll("[data-ags-reader-mode]").forEach(button => button.onclick = () => { ui.readerMode = button.dataset.agsReaderMode; ui.pageZoom = false; refreshBody(); });
    document.querySelectorAll("[data-ags-complete-lesson]").forEach(button => button.onclick = () => {
      const progress = readProgress();
      progress.lessons ||= {};
      progress.lessons[button.dataset.agsCompleteLesson] = !progress.lessons[button.dataset.agsCompleteLesson];
      writeProgress(progress);
      refreshBody();
    });
    document.querySelectorAll("[data-ags-answer]").forEach(button => button.onclick = () => answerQuestion(button.dataset.agsAnswer));
    document.querySelectorAll("[data-ags-question-index]").forEach(button => button.onclick = () => { ui.testIndex = Number(button.dataset.agsQuestionIndex); ui.questionStartedAt = Date.now(); refreshBody(); });
    document.querySelector("[data-ags-test-prev]")?.addEventListener("click", () => { ui.testIndex--; ui.questionStartedAt = Date.now(); refreshBody(); });
    document.querySelector("[data-ags-test-next]")?.addEventListener("click", () => { ui.testIndex++; ui.questionStartedAt = Date.now(); refreshBody(); });
    document.querySelectorAll("[data-ags-reset-test]").forEach(button => button.onclick = () => resetTest(button.dataset.agsResetTest));
    document.querySelector("[data-ags-toggle-test-page]")?.addEventListener("click", () => { ui.showTestPage = !ui.showTestPage; refreshBody(); });
    document.querySelector("[data-ags-page-zoom]")?.addEventListener("click", () => { ui.pageZoom = !ui.pageZoom; refreshBody(); });
    document.querySelector("[data-ags-page-prev]")?.addEventListener("click", () => { ui.viewerPage--; ui.pageZoom = false; refreshBody(); });
    document.querySelector("[data-ags-page-next]")?.addEventListener("click", () => { ui.viewerPage++; ui.pageZoom = false; refreshBody(); });
    document.querySelectorAll("[data-ags-page]").forEach(button => button.onclick = () => { ui.viewerPage = Number(button.dataset.agsPage); ui.pageZoom = false; refreshBody(); });
    const pageSelect = document.querySelector("#ags-page-select");
    if (pageSelect) pageSelect.onchange = event => { ui.viewerPage = Number(event.target.value); ui.pageZoom = false; refreshBody(); };
    const resultItems = searchResults();
    document.querySelectorAll("[data-ags-search-result]").forEach(button => button.onclick = () => {
      const result = resultItems[Number(button.dataset.agsSearchResult)];
      ui.query = "";
      if (result.type === "lesson") {
        ui.tab = "study";
        ui.activeResourceId = result.resourceId;
        ui.readerMode = "text";
      } else if (result.type === "question") {
        ui.tab = "tests";
        ui.activeTestId = result.testId;
        ui.testIndex = result.questionIndex;
      } else {
        ui.tab = "pages";
        ui.viewerPage = result.page;
      }
      draw();
    });
  }

  function startTest(id) {
    ui.activeResourceId = "";
    const progress = readProgress();
    if (id === "unanswered") {
      ui.sessionQuestionIds = questions().filter(question => !progress.answers?.[question.id]).map(question => question.id);
      ui.sessionTitle = "Henüz Çözülmeyen Sorular";
      ui.activeTestId = "session";
    } else if (id === "wrong-only") {
      ui.sessionQuestionIds = questions().filter(question => progress.answers?.[question.id] && !progress.answers[question.id].ok).map(question => question.id);
      ui.sessionTitle = "Yanlış Cevaplanan Sorular";
      ui.sessionQuestionIds.forEach(questionId => delete progress.answers?.[questionId]);
      writeProgress(progress);
      ui.activeTestId = "session";
    } else {
      ui.activeTestId = id;
      ui.sessionQuestionIds = [];
      ui.sessionTitle = "";
    }
    ui.tab = "tests";
    const current = id === "all-tests" || id === "unanswered" || id === "wrong-only" ? null : progress.tests?.[id];
    ui.testIndex = Math.max(0, Number(current?.lastIndex || 0));
    ui.showTestPage = false;
    ui.questionStartedAt = Date.now();
    refreshBody();
  }

  function answerQuestion(selected) {
    const current = currentTest();
    const question = current?.resource?.questions?.[ui.testIndex];
    if (!question) return;
    const progress = readProgress();
    progress.answers ||= {};
    if (progress.answers[question.id]) return;
    const ok = selected === question.answer;
    progress.answers[question.id] = { selected, ok, answeredAt: new Date().toISOString() };
    progress.tests ||= {};
    progress.tests[current.resource.id] = { lastIndex: ui.testIndex, updatedAt: new Date().toISOString() };
    writeProgress(progress);
    try {
      recordEducationAnswer(question, ok);
      if (ok) removeWrongQuestion(question); else saveWrongQuestion(question);
      recordAttempt(question, selected, ok, { durationMs: Date.now() - ui.questionStartedAt, eliminatedCount: 0, examTitle: `AGS Çalışma Yaprakları · ${current.resource.title}` });
    } catch (_) {}
    refreshBody();
  }

  function resetTest(id) {
    const current = currentTest();
    if (!current?.resource?.questions?.length) return;
    if (!confirm("Bu testteki işaretlemelerin sıfırlanmasını istiyor musun?")) return;
    const progress = readProgress();
    current.resource.questions.forEach(question => delete progress.answers?.[question.id]);
    if (progress.tests) delete progress.tests[id];
    writeProgress(progress);
    ui.testIndex = 0;
    ui.questionStartedAt = Date.now();
    refreshBody();
  }

  return { render };
})();
