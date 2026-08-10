(function () {
  "use strict";

  const MANIFEST_URL = "education-library/education-library.json";
  const SUMMARY_PAGE_KEY = "educationSummaryPagesV1";
  const SUMMARY_MODE_KEY = "educationSummaryModesV1";
  const SUMMARY_ZOOM_KEY = "educationSummaryZoomV1";
  const BOOK_PAGE_KEY = "kpssEducationBookPageV1";
  const BOOK_ZOOM_KEY = "kpssEducationBookZoomV1";
  let manifestPromise = null;
  let renderToken = 0;

  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(MANIFEST_URL).then(response => {
        if (!response.ok) throw new Error("Eğitim Bilimleri içerik dosyası bulunamadı.");
        return response.json();
      }).then(manifest => {
        if (!Array.isArray(manifest.summaries) || manifest.summaries.length !== 6) {
          throw new Error("Eğitim Bilimleri özet listesi eksik.");
        }
        if (manifest.book?.pages !== 208) throw new Error("KPSS kitabının 208 sayfası doğrulanamadı.");
        return manifest;
      }).catch(error => {
        manifestPromise = null;
        throw error;
      });
    }
    return manifestPromise;
  }

  function paddedPage(page, digits = 2) {
    return String(page).padStart(digits, "0");
  }

  function assetPath(pattern, page, digits) {
    return pattern.replace("{page}", paddedPage(page, digits));
  }

  function loadingCard(message, token) {
    return `<section class="education-loading" data-education-token="${token}" aria-live="polite"><span></span><p>${esc(message)}</p></section>`;
  }

  function renderIsActive(token) {
    return token === renderToken && Boolean(document.querySelector(`[data-education-token="${token}"]`));
  }

  function showLoadError(error, retry) {
    app.innerHTML = `<section class="education-library-error"><h2>İçerik açılamadı</h2><p>${esc(error?.message || "Bilinmeyen hata")}</p><button class="primary" id="education-library-retry">Yeniden Dene</button></section>`;
    document.querySelector("#education-library-retry")?.addEventListener("click", retry);
  }

  function summaryProgress(id) {
    return store.get(SUMMARY_PAGE_KEY, {})[id] || 1;
  }

  function renderEducationLibraryHub() {
    const token = ++renderToken;
    setTitle("Eğitim Bilimleri", "Özetler, AI testleri ve kitap", true);
    app.innerHTML = loadingCard("Eğitim Bilimleri kütüphanesi açılıyor…", token);
    loadManifest().then(manifest => {
      if (!renderIsActive(token)) return;
      app.innerHTML = `<div class="education-library-page">
        <section class="education-library-hero">
          <div><span class="library-eyebrow">YENİ · V26.32</span><h2>Eğitim Bilimleri Kütüphanesi</h2><p>Gönderdiğin altı özeti özgün sayfa düzeniyle oku, yalnız seçtiğin özete dayalı AI testi oluştur veya 208 sayfalık KPSS test kitabını çevrimdışı aç.</p></div>
          <div class="education-library-metrics"><span><b>6</b><small>Ders özeti</small></span><span><b>8</b><small>Özet sayfası</small></span><span><b>208</b><small>Test kitabı sayfası</small></span></div>
          <div class="education-library-actions"><button class="primary" id="summary-ai-open">✨ Özetlerden AI Testi</button><button class="secondary" id="kpss-book-open">📚 KPSS Test Kitabı</button></div>
        </section>

        <section class="education-library-section">
          <div class="education-library-heading"><div><small>GÖNDERDİĞİN DOSYALAR</small><h3>Ders özetleri</h3><p>Sayfayı yakınlaştırabilir, metin görünümünden cümle seçip kaydedebilirsin.</p></div></div>
          <div class="education-summary-grid">${manifest.summaries.map(summary => `<button class="education-summary-card" data-summary-id="${summary.id}" style="--summary-accent:${summary.accent}">
            <span class="education-summary-cover"><img src="${assetPath(summary.imagePattern, 1, 2)}" alt="${esc(summary.title)} özetinin ilk sayfası" loading="lazy"></span>
            <span class="education-summary-card-copy"><small>${summary.icon} DERS ÖZETİ</small><b>${esc(summary.title)}</b><em>${summary.pages} sayfa · kaldığın sayfa ${Math.min(summaryProgress(summary.id), summary.pages)}</em></span><i>›</i>
          </button>`).join("")}</div>
        </section>

        <section class="education-library-section">
          <div class="education-library-heading"><div><small>TÜM EĞİTİM ARAÇLARI</small><h3>Kitap, soru bankası ve AI</h3></div></div>
          <div class="education-existing-tools">
            <button data-education-tool="summary-ai"><span>✨</span><b>Özet Tabanlı AI Testi</b><small>Yalnız seçtiğin PDF özetindeki bilgiler</small></button>
            <button data-education-tool="kpss-book"><span>📚</span><b>KPSS Eğitim Bilimleri Kitabı</b><small>208 sayfa · çevrimdışı okuyucu</small></button>
            <button data-education-tool="ags"><span>📗</span><b>AGS Eğitim Bilimleri Kitabı</b><small>40 sayfa · konu anlatımı ve 81 soru</small></button>
            <button data-education-tool="offline"><span>📘</span><b>Çevrimdışı Soru Bankası</b><small>${offlineEducationQuestions().length} hazır soru</small></button>
            <button data-education-tool="ai-center"><span>🎓</span><b>AI Eğitim Bilimleri Merkezi</b><small>7 alanlık konu anlatımı ve çalışma araçları</small></button>
            <button data-education-tool="ai-exam"><span>📝</span><b>Genel AI Eğitim Denemesi</b><small>Alan seçmeli, kaynak doğrulamalı yeni sorular</small></button>
          </div>
        </section>
      </div>`;
      document.querySelector("#summary-ai-open").onclick = () => renderSummaryAiTestBuilder();
      document.querySelector("#kpss-book-open").onclick = () => renderKpssBookReader();
      document.querySelectorAll("[data-summary-id]").forEach(button => button.onclick = () => renderEducationSummary(button.dataset.summaryId));
      document.querySelectorAll("[data-education-tool]").forEach(button => button.onclick = () => ({
        "summary-ai": renderSummaryAiTestBuilder,
        "kpss-book": renderKpssBookReader,
        ags: () => EBWorkbook.render(),
        offline: renderOfflineEducation,
        "ai-center": renderEducationCenter,
        "ai-exam": renderAiExam,
      }[button.dataset.educationTool])());
    }).catch(error => {
      if (renderIsActive(token)) showLoadError(error, renderEducationLibraryHub);
    });
  }

  function renderEducationSummary(id, requestedPage, requestedMode, requestedZoom) {
    const token = ++renderToken;
    setTitle("Ders Özeti", "Eğitim Bilimleri Kütüphanesi", true);
    app.innerHTML = loadingCard("Özet açılıyor…", token);
    loadManifest().then(manifest => {
      if (!renderIsActive(token)) return;
      const summary = manifest.summaries.find(item => item.id === id);
      if (!summary) throw new Error("Seçilen ders özeti bulunamadı.");
      const pageState = store.get(SUMMARY_PAGE_KEY, {});
      const modeState = store.get(SUMMARY_MODE_KEY, {});
      const zoomState = store.get(SUMMARY_ZOOM_KEY, {});
      const page = Math.max(1, Math.min(summary.pages, requestedPage || pageState[id] || 1));
      const mode = requestedMode || modeState[id] || "original";
      const zoom = Math.max(1, Math.min(2.5, requestedZoom || zoomState[id] || 1));
      pageState[id] = page; modeState[id] = mode; zoomState[id] = zoom;
      store.set(SUMMARY_PAGE_KEY, pageState); store.set(SUMMARY_MODE_KEY, modeState); store.set(SUMMARY_ZOOM_KEY, zoomState);
      setTitle(summary.title, `${summary.pages} sayfalık ders özeti`, true);
      const paragraphs = summary.aiText.split(/\n\n+/).filter(Boolean);
      const reader = mode === "text" ? `<article class="education-summary-text selectable-study-text" data-save-source="${esc(`${summary.title} · Gönderilen Özet`)}">
          <div class="summary-text-note"><b>Metin görünümü</b><span>Cümle seçip “Cümleyi Kaydet” ile saklayabilirsin. Görsel düzen için Orijinal Özet sekmesini kullan.</span></div>
          ${paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join("")}
        </article><p class="sentence-save-hint">📌 Bir cümleye basılı tutup seç; altta açılan “Cümleyi Kaydet” düğmesiyle kaydet.</p>` : `<div class="education-summary-image-frame ${zoom > 1 ? "zoomed" : ""}">
          <img src="${assetPath(summary.imagePattern, page, 2)}" alt="${esc(summary.title)} · Sayfa ${page}" style="width:${Math.round(zoom * 100)}%" draggable="false">
        </div>`;
      app.innerHTML = `<div class="education-library-page summary-reader-page">
        <div class="reader-return-row"><button class="secondary" id="summary-back">‹ Eğitim Bilimleri</button><button class="summary-ai-shortcut" id="summary-ai-this">✨ Bu Özetten Test</button></div>
        <section class="summary-reader-head" style="--summary-accent:${summary.accent}"><span>${summary.icon}</span><div><small>GÖNDERİLEN DERS ÖZETİ</small><h2>${esc(summary.title)}</h2><p>${summary.pages} sayfa · kaynak: ${esc(summary.sourceFile)}</p></div></section>
        <div class="summary-reader-tabs"><button class="${mode === "original" ? "active" : ""}" data-summary-mode="original">🖼 Orijinal Özet</button><button class="${mode === "text" ? "active" : ""}" data-summary-mode="text">Aa Metin ve Cümle Kaydetme</button></div>
        ${mode === "original" ? `<div class="reader-control-bar">
          <button data-summary-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>‹ Önceki</button>
          <span><b>Sayfa ${page}</b><small>/ ${summary.pages}</small></span>
          <button data-summary-page="${page + 1}" ${page >= summary.pages ? "disabled" : ""}>Sonraki ›</button>
          <div class="reader-zoom-controls"><button data-summary-zoom="${zoom - .25}" ${zoom <= 1 ? "disabled" : ""}>−</button><button data-summary-zoom="1">Sığdır</button><button data-summary-zoom="${zoom + .25}" ${zoom >= 2.5 ? "disabled" : ""}>+</button></div>
        </div>` : ""}
        ${reader}
        ${mode === "original" && summary.pages > 1 ? `<div class="summary-page-dots">${Array.from({ length: summary.pages }, (_, index) => `<button class="${page === index + 1 ? "active" : ""}" data-summary-page="${index + 1}">${index + 1}</button>`).join("")}</div>` : ""}
      </div>`;
      document.querySelector("#summary-back").onclick = renderEducationLibraryHub;
      document.querySelector("#summary-ai-this").onclick = () => renderSummaryAiTestBuilder(summary.id);
      document.querySelectorAll("[data-summary-mode]").forEach(button => button.onclick = () => renderEducationSummary(summary.id, page, button.dataset.summaryMode, zoom));
      document.querySelectorAll("[data-summary-page]").forEach(button => button.onclick = () => renderEducationSummary(summary.id, +button.dataset.summaryPage, mode, zoom));
      document.querySelectorAll("[data-summary-zoom]").forEach(button => button.onclick = () => renderEducationSummary(summary.id, page, mode, +button.dataset.summaryZoom));
    }).catch(error => {
      if (renderIsActive(token)) showLoadError(error, () => renderEducationSummary(id));
    });
  }

  function renderKpssBookReader(requestedPage, requestedZoom) {
    const token = ++renderToken;
    setTitle("KPSS Test Kitabı", "208 sayfa · çevrimdışı", true);
    app.innerHTML = loadingCard("KPSS Eğitim Bilimleri kitabı açılıyor…", token);
    loadManifest().then(manifest => {
      if (!renderIsActive(token)) return;
      const book = manifest.book;
      const page = Math.max(1, Math.min(book.pages, Math.round(requestedPage || store.get(BOOK_PAGE_KEY, 1) || 1)));
      const zoom = Math.max(1, Math.min(2.5, requestedZoom || store.get(BOOK_ZOOM_KEY, 1) || 1));
      store.set(BOOK_PAGE_KEY, page); store.set(BOOK_ZOOM_KEY, zoom);
      const percent = Math.round(page / book.pages * 100);
      app.innerHTML = `<div class="education-library-page kpss-reader-page">
        <div class="reader-return-row"><button class="secondary" id="kpss-back">‹ Eğitim Bilimleri</button><span class="reader-offline-badge">ÇEVRİMDIŞI</span></div>
        <section class="kpss-reader-head"><span>📚</span><div><small>KPSS EĞİTİM BİLİMLERİ</small><h2>Test Kitabı</h2><p>208 sayfa · yalnız açık sayfa belleğe alınır</p></div></section>
        <div class="kpss-progress"><i style="width:${percent}%"></i></div>
        <div class="reader-control-bar kpss-controls">
          <button data-book-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>‹ Önceki</button>
          <label class="book-page-jump"><span>Sayfa</span><input id="book-page-input" type="number" min="1" max="${book.pages}" value="${page}" inputmode="numeric"><button id="book-page-go">Git</button></label>
          <button data-book-page="${page + 1}" ${page >= book.pages ? "disabled" : ""}>Sonraki ›</button>
          <div class="reader-zoom-controls"><button data-book-zoom="${zoom - .25}" ${zoom <= 1 ? "disabled" : ""}>−</button><button data-book-zoom="1">Sığdır</button><button data-book-zoom="${zoom + .25}" ${zoom >= 2.5 ? "disabled" : ""}>+</button></div>
        </div>
        <div class="kpss-page-label"><b>Sayfa ${page}</b><span>${book.pages} sayfanın ${page}. sayfası · %${percent}</span></div>
        <div class="kpss-book-frame ${zoom > 1 ? "zoomed" : ""}"><img id="kpss-page-image" src="${assetPath(book.imagePattern, page, 3)}" alt="KPSS Eğitim Bilimleri test kitabı · Sayfa ${page}" style="width:${Math.round(zoom * 100)}%" draggable="false"></div>
        <div class="book-bottom-navigation"><button data-book-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>‹ ${Math.max(1, page - 1)}</button><span>${page} / ${book.pages}</span><button data-book-page="${page + 1}" ${page >= book.pages ? "disabled" : ""}>${Math.min(book.pages, page + 1)} ›</button></div>
      </div>`;
      document.querySelector("#kpss-back").onclick = renderEducationLibraryHub;
      document.querySelector("#book-page-go").onclick = () => renderKpssBookReader(+document.querySelector("#book-page-input").value, zoom);
      document.querySelector("#book-page-input").addEventListener("keydown", event => {
        if (event.key === "Enter") renderKpssBookReader(+event.currentTarget.value, zoom);
      });
      document.querySelectorAll("[data-book-page]").forEach(button => button.onclick = () => renderKpssBookReader(+button.dataset.bookPage, zoom));
      document.querySelectorAll("[data-book-zoom]").forEach(button => button.onclick = () => renderKpssBookReader(page, +button.dataset.bookZoom));
      const image = document.querySelector("#kpss-page-image");
      image.onerror = () => toast("Bu kitap sayfası açılamadı.");
      if (page < book.pages) {
        const preload = new Image();
        preload.src = assetPath(book.imagePattern, page + 1, 3);
      }
    }).catch(error => {
      if (renderIsActive(token)) showLoadError(error, () => renderKpssBookReader());
    });
  }

  function evidenceKey(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("tr-TR")
      .replace(/[’‘`´]/g, "'")
      .replace(/[-‐‑‒–—]+/g, " ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function evidenceWords(value) {
    return evidenceKey(value).split(" ").filter(word => word.length > 1);
  }

  function summaryEvidenceCandidates(value) {
    return String(value || "")
      .replace(/\r/g, "")
      .split(/(?<=[.!?])\s+|\n+/u)
      .map(sentence => sentence.replace(/^[-•*\s]+/, "").trim())
      .filter(sentence => sentence.length >= 12);
  }

  function resolveSummaryEvidence(summaryText, evidence) {
    const reference = evidenceKey(summaryText);
    const normalized = evidenceKey(evidence);
    const words = evidenceWords(evidence);
    if (words.length >= 3 && normalized && reference.includes(normalized)) return String(evidence).trim();

    if (words.length < 3) return "";
    const evidenceSet = new Set(words);
    let best = { score: 0, overlap: 0, sentence: "" };
    for (const sentence of summaryEvidenceCandidates(summaryText)) {
      const sentenceSet = new Set(evidenceWords(sentence));
      let overlap = 0;
      evidenceSet.forEach(word => { if (sentenceSet.has(word)) overlap += 1; });
      const score = overlap / evidenceSet.size;
      if (score > best.score || (score === best.score && overlap > best.overlap)) best = { score, overlap, sentence };
    }
    // AI bazen noktalama/ek farkıyla dayanak döndürüyor. En az üç ortak anlamlı kelime
    // ve %65 örtüşme varsa kanıtı AI metninden değil, doğrudan özetin gerçek cümlesinden al.
    if (best.overlap >= 3 && best.score >= 0.65) return best.sentence;
    return "";
  }

  function normalizeSummaryQuestion(question, summary, index) {
    const choices = question?.choices || {};
    const answer = String(question?.answer || "").toUpperCase();
    if (!question?.question || !["A", "B", "C", "D"].every(key => String(choices[key] || "").trim()) || !choices[answer]) return null;
    const evidence = resolveSummaryEvidence(summary.aiText, String(question?.evidence || "").trim());
    if (!evidence) return null;
    return {
      id: `summary_${summary.id}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      question: String(question.question).trim(),
      choices: { A: String(choices.A).trim(), B: String(choices.B).trim(), C: String(choices.C).trim(), D: String(choices.D).trim() },
      answer,
      explanation: `${String(question.explanation || "").trim()}\n\nÖzetteki dayanak: “${evidence}”`,
      educationArea: summary.title,
      educationSubtopic: String(question.subtopic || "").trim(),
      questionType: String(question.type || "").trim(),
      sources: [{ name: `Gönderilen ${summary.title} özet PDF’i`, url: "" }],
      summaryEvidence: evidence,
      summarySourceId: summary.id,
    };
  }

  function renderSummaryAiTestBuilder(selectedId) {
    const token = ++renderToken;
    setTitle("Özet Tabanlı AI Testi", "Yalnız gönderdiğin özetlerden", true);
    app.innerHTML = loadingCard("Özet listesi hazırlanıyor…", token);
    loadManifest().then(manifest => {
      if (!renderIsActive(token)) return;
      const remembered = store.get("summaryAiSubjectV1", selectedId || manifest.summaries[0].id);
      const activeId = selectedId || remembered;
      const count = store.get("summaryAiCountV1", 10);
      const level = store.get("summaryAiLevelV1", "Orta");
      app.innerHTML = `<div class="education-library-page summary-ai-page">
        <div class="reader-return-row"><button class="secondary" id="summary-ai-back">‹ Eğitim Bilimleri</button><span class="summary-grounded-badge">YALNIZ PDF ÖZETİ</span></div>
        <section class="summary-ai-hero"><span>✨</span><div><small>KAYNAĞA BAĞLI SORU ÜRETİMİ</small><h2>Özetlerden AI Testi</h2><p>Seçtiğin dersin gönderilmiş özet metni AI’ye kaynak olarak verilir. Özet dışında bilgi kullanılmaz; her sorunun dayanak cümlesi ayrıca doğrulanır.</p></div></section>
        <div class="summary-ai-form">
          <label>Ders özeti</label><select id="summary-ai-subject">${manifest.summaries.map(summary => `<option value="${summary.id}" ${summary.id === activeId ? "selected" : ""}>${summary.title}</option>`).join("")}</select>
          <div class="ai-control-grid"><div><label>Soru sayısı</label><select id="summary-ai-count">${[5, 10, 15, 20].map(value => `<option ${value === count ? "selected" : ""}>${value}</option>`).join("")}</select></div><div><label>Zorluk</label><select id="summary-ai-level">${["Kolay", "Orta", "Zor"].map(value => `<option ${value === level ? "selected" : ""}>${value}</option>`).join("")}</select></div></div>
          <div class="summary-ai-rules"><span>✓ Dört seçenek, tek doğru</span><span>✓ Güçlü çeldiriciler</span><span>✓ Kısa gerekçeli açıklama</span><span>✓ Dayanak cümlesi PDF metninde kontrol edilir</span></div>
          <div class="education-library-actions"><button class="primary" id="summary-ai-generate">✨ Özete Dayalı Testi Oluştur</button><button class="secondary" id="summary-ai-read">Özeti Önce Aç</button></div>
          <div id="summary-ai-status"></div>
        </div>
      </div>`;
      document.querySelector("#summary-ai-back").onclick = renderEducationLibraryHub;
      document.querySelector("#summary-ai-read").onclick = () => renderEducationSummary(document.querySelector("#summary-ai-subject").value);
      document.querySelector("#summary-ai-generate").onclick = () => generateSummaryAiQuestions(manifest);
    }).catch(error => {
      if (renderIsActive(token)) showLoadError(error, () => renderSummaryAiTestBuilder(selectedId));
    });
  }

  async function generateSummaryAiQuestions(manifest) {
    const subjectId = document.querySelector("#summary-ai-subject").value;
    const count = +document.querySelector("#summary-ai-count").value;
    const level = document.querySelector("#summary-ai-level").value;
    const summary = manifest.summaries.find(item => item.id === subjectId);
    const button = document.querySelector("#summary-ai-generate");
    const status = document.querySelector("#summary-ai-status");
    if (!summary) return toast("Ders özeti bulunamadı.");
    store.set("summaryAiSubjectV1", subjectId); store.set("summaryAiCountV1", count); store.set("summaryAiLevelV1", level);
    button.disabled = true;

    const accepted = [];
    const seenQuestions = new Set();
    const maxAttempts = 4;

    try {
      for (let attempt = 1; attempt <= maxAttempts && accepted.length < count; attempt += 1) {
        const remaining = count - accepted.length;
        status.innerHTML = `<div class="result">${esc(summary.title)} özeti okunuyor · ${accepted.length}/${count} soru hazır${attempt > 1 ? ` · yalnız eksik ${remaining} soru tamamlanıyor` : ""}…</div>`;
        const existing = accepted.map(item => item.question).slice(-12);
        const prompt = `Aşağıda kullanıcının yüklediği “${summary.title}” ders özetinin tam metni bulunuyor.

--- ÖZET METNİ BAŞLANGICI ---
${summary.aiText}
--- ÖZET METNİ SONU ---

Yalnız bu özet metnindeki açık bilgilere dayanarak ${level} düzeyde ${remaining} özgün, dört seçenekli Eğitim Bilimleri sorusu üret.

Kesin kurallar:
- Özet dışında hiçbir bilgi, güncel mevzuat, web kaynağı veya genel bilgini kullanma.
- Özet metni bir konuda açık değilse o konudan soru yazma.
- Dört seçenek A, B, C ve D olsun; yalnız bir kesin doğru cevap bulunsun.
- Soruları özetin farklı ana başlıklarına dengeli dağıt. Aynı bilgiyi farklı cümleyle tekrar tekrar sorma.
- ${level === "Kolay" ? "Temel kavram ve doğrudan ayrımlara ağırlık ver." : level === "Zor" ? "Kavram karşılaştırması, kısa vaka ve güçlü çeldiricilere ağırlık ver; yine de özetin dışına çıkma." : "Temel bilgi, kavram ayrımı ve kısa vaka türlerini dengeli kullan."}
- Her açıklama 2-3 kısa cümle olsun; doğru cevabın nedenini ve en güçlü çeldiriciden farkını belirt.
- Her soruda evidence alanına özetten KOPYALA-YAPIŞTIR yöntemiyle alınmış, ardışık 3-12 kelimelik bir dayanak parçası yaz. Kelimeleri değiştirme, ekleme, çıkarma veya yeniden çekimleme. Bu ifade özet metninde birebir bulunmalı.
${existing.length ? `- Şu sorular zaten hazırlandı; bunları veya aynı bilgiyi yeniden sorma:\n${existing.map((item, index) => `${index + 1}. ${item}`).join("\n")}` : ""}

Yalnızca JSON döndür:
{"questions":[{"subtopic":"özetin ana başlığı","type":"bilgi|karşılaştırma|kısa vaka|olumsuz kök","question":"...","choices":{"A":"...","B":"...","C":"...","D":"..."},"answer":"A","explanation":"...","evidence":"özetten aynen kopyalanan kısa ifade"}]}`;

        const text = await openAIText(
          prompt,
          "Sen yalnızca verilen kullanıcı belgesinden soru yazan titiz bir Eğitim Bilimleri sınav editörüsün. Belgenin dışındaki bilgiyi kullanma. evidence alanını mutlaka belgeden ardışık kelimeler halinde aynen kopyala. JSON dışında hiçbir şey döndürme.",
          { maxOutputTokens: Math.max(1800, remaining * 430), timeoutMs: 120000, networkAttempts: 2 }
        );
        const parsed = parseJsonResponse(text);
        const candidates = Array.isArray(parsed?.questions) ? parsed.questions : [];

        candidates.forEach((candidate, candidateIndex) => {
          if (accepted.length >= count) return;
          const normalized = normalizeSummaryQuestion(candidate, summary, accepted.length + candidateIndex);
          if (!normalized) return;
          const key = evidenceKey(normalized.question);
          if (!key || seenQuestions.has(key)) return;
          seenQuestions.add(key);
          accepted.push(normalized);
        });
      }

      if (!accepted.length) throw new Error("AI soruları özet metnine bağlayamadı. Lütfen tekrar dene.");
      if (accepted.length < count) {
        status.innerHTML = `<div class="result">${count} sorunun ${accepted.length} tanesi özetle doğrulandı. Doğrulanan sorularla test açılıyor; geçersiz sorular yüzünden tüm test artık sıfırlanmıyor.</div>`;
      }
      startExam(accepted, `Özet Testi · ${summary.title}`);
    } catch (error) {
      status.innerHTML = `<div class="result">Hata: ${esc(error?.message || error)}</div>`;
      button.disabled = false;
    }
  }

  globalThis.renderEducationLibraryHub = renderEducationLibraryHub;
  globalThis.renderEducationSummary = renderEducationSummary;
  globalThis.renderKpssBookReader = renderKpssBookReader;
  globalThis.renderSummaryAiTestBuilder = renderSummaryAiTestBuilder;
})();
