(function () {
  "use strict";

  const STORAGE_KEY = "savedLessonSentencesV1";
  const SELECTABLE_SELECTOR = ".selectable-study-text, .lesson-output, #topic-lesson-content, .ags-lesson-text";
  const MAX_SELECTION_LENGTH = 5000;
  let pendingSelection = null;
  let toolbarPressed = false;
  let selectionTimer = 0;

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]);
  }

  function storageGet(fallback = []) {
    try {
      if (typeof store !== "undefined") return store.get(STORAGE_KEY, fallback);
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function storageSet(value) {
    if (typeof store !== "undefined") store.set(STORAGE_KEY, value);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, MAX_SELECTION_LENGTH);
  }

  function savedLessonSentences() {
    const items = storageGet([]);
    if (!Array.isArray(items)) return [];
    return items
      .filter(item => item && item.id && normalizeText(item.text))
      .map(item => ({
        id: String(item.id),
        text: normalizeText(item.text),
        source: normalizeText(item.source) || "Konu anlatımı",
        savedAt: item.savedAt || new Date().toISOString(),
      }))
      .slice(0, 500);
  }

  function sourceFor(container) {
    const explicit = normalizeText(container?.dataset?.saveSource);
    if (explicit) return explicit;
    const agsTitle = container?.closest(".ags-lesson-reader")?.querySelector("header h3")?.textContent;
    if (normalizeText(agsTitle)) return `AGS Eğitim Bilimleri · ${normalizeText(agsTitle)}`;
    const pageTitle = document.querySelector("#page-title")?.textContent;
    const subtitle = document.querySelector("#subtitle")?.textContent;
    return [pageTitle, subtitle].map(normalizeText).filter(Boolean).join(" · ") || "Konu anlatımı";
  }

  function ensureToolbar() {
    let toolbar = document.querySelector("#sentence-save-toolbar");
    if (toolbar) return toolbar;
    toolbar = document.createElement("aside");
    toolbar.id = "sentence-save-toolbar";
    toolbar.className = "sentence-save-toolbar hidden";
    toolbar.setAttribute("role", "dialog");
    toolbar.setAttribute("aria-label", "Seçili cümleyi kaydet");
    toolbar.innerHTML = `
      <div class="sentence-save-toolbar-copy">
        <small>SEÇİLİ METİN</small>
        <span id="sentence-save-preview"></span>
      </div>
      <button class="primary" id="sentence-save-confirm">📌 Cümleyi Kaydet</button>
      <button class="secondary" id="sentence-save-cancel" aria-label="Seçimi kapat">Kapat</button>`;
    document.body.appendChild(toolbar);

    toolbar.addEventListener("pointerdown", event => {
      toolbarPressed = true;
      event.preventDefault();
    });
    toolbar.addEventListener("pointerup", () => setTimeout(() => { toolbarPressed = false; }, 0));
    toolbar.querySelector("#sentence-save-confirm").addEventListener("click", savePendingSelection);
    toolbar.querySelector("#sentence-save-cancel").addEventListener("click", clearSelectionToolbar);
    return toolbar;
  }

  function showSelectionToolbar(selection) {
    pendingSelection = selection;
    const toolbar = ensureToolbar();
    const preview = toolbar.querySelector("#sentence-save-preview");
    preview.textContent = selection.text.length > 150 ? `${selection.text.slice(0, 150)}…` : selection.text;
    toolbar.classList.remove("hidden");
  }

  function clearSelectionToolbar() {
    pendingSelection = null;
    const toolbar = document.querySelector("#sentence-save-toolbar");
    toolbar?.classList.add("hidden");
    try { window.getSelection()?.removeAllRanges(); } catch (_) {}
  }

  function captureSelection() {
    if (toolbarPressed) return;
    const selection = window.getSelection?.();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      clearSelectionToolbar();
      return;
    }
    const anchorElement = selection.anchorNode?.nodeType === Node.ELEMENT_NODE
      ? selection.anchorNode
      : selection.anchorNode?.parentElement;
    const focusElement = selection.focusNode?.nodeType === Node.ELEMENT_NODE
      ? selection.focusNode
      : selection.focusNode?.parentElement;
    const container = anchorElement?.closest?.(SELECTABLE_SELECTOR);
    if (!container || !focusElement || !container.contains(focusElement)) {
      clearSelectionToolbar();
      return;
    }
    const text = normalizeText(selection.toString());
    if (text.length < 2) {
      clearSelectionToolbar();
      return;
    }
    showSelectionToolbar({ text, source: sourceFor(container) });
  }

  function scheduleSelectionCapture(delay = 90) {
    clearTimeout(selectionTimer);
    selectionTimer = setTimeout(captureSelection, delay);
  }

  function savePendingSelection() {
    if (!pendingSelection?.text) return clearSelectionToolbar();
    const items = savedLessonSentences();
    const duplicate = items.some(item => item.text.toLocaleLowerCase("tr-TR") === pendingSelection.text.toLocaleLowerCase("tr-TR"));
    if (duplicate) {
      if (typeof toast === "function") toast("Bu cümle zaten kayıtlı.");
      clearSelectionToolbar();
      return;
    }
    items.unshift({
      id: `sentence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: pendingSelection.text,
      source: pendingSelection.source,
      savedAt: new Date().toISOString(),
    });
    storageSet(items.slice(0, 500));
    if (typeof toast === "function") toast("Cümle Kaydettiğim Cümleler bölümüne eklendi.");
    clearSelectionToolbar();
  }

  function copyText(value) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    const field = document.createElement("textarea");
    field.value = value;
    field.style.position = "fixed";
    field.style.left = "-9999px";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
    return Promise.resolve();
  }

  function renderSavedSentences() {
    clearSelectionToolbar();
    const items = savedLessonSentences();
    setTitle("Kaydettiğim Cümleler", `${items.length} kayıt · yalnız bu tablette`, true);
    app.innerHTML = `<section class="hero saved-sentences-hero">
      <h2>Seçip kaydettiğin konu cümleleri</h2>
      <p>AGS konu anlatımında veya AI konu anlatımında bir cümleye basılı tutup seç. Açılan “Cümleyi Kaydet” düğmesiyle buraya ekle.</p>
      <div class="actions"><button class="primary" id="saved-sentences-open-ags">AGS Kitabını Aç</button>${items.length ? `<button class="danger" id="saved-sentences-clear">Tümünü Temizle</button>` : ""}</div>
    </section>
    ${items.length ? `<div class="saved-sentence-list">${items.map(item => `<article class="saved-sentence-card">
      <small>${escapeHtml(item.source)} · ${escapeHtml(new Date(item.savedAt).toLocaleString("tr-TR"))}</small>
      <blockquote>${escapeHtml(item.text)}</blockquote>
      <div><button class="secondary" data-sentence-copy="${escapeHtml(item.id)}">Kopyala</button><button class="text-danger" data-sentence-delete="${escapeHtml(item.id)}">Sil</button></div>
    </article>`).join("")}</div>` : `<section class="ags-empty saved-sentences-empty"><h3>Henüz cümle kaydetmedin.</h3><p>Bir konu anlatımını aç, metne basılı tutup istediğin cümleyi seç ve altta çıkan kaydet düğmesine dokun.</p></section>`}`;

    document.querySelector("#saved-sentences-open-ags")?.addEventListener("click", () => EBWorkbook.render());
    document.querySelector("#saved-sentences-clear")?.addEventListener("click", () => {
      if (!confirm("Kaydettiğin bütün cümleler silinsin mi?")) return;
      storageSet([]);
      renderSavedSentences();
    });
    document.querySelectorAll("[data-sentence-delete]").forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.sentenceDelete;
      storageSet(savedLessonSentences().filter(item => item.id !== id));
      renderSavedSentences();
    }));
    document.querySelectorAll("[data-sentence-copy]").forEach(button => button.addEventListener("click", async () => {
      const item = savedLessonSentences().find(candidate => candidate.id === button.dataset.sentenceCopy);
      if (!item) return;
      try {
        await copyText(item.text);
        if (typeof toast === "function") toast("Cümle panoya kopyalandı.");
      } catch (_) {
        if (typeof toast === "function") toast("Cümle kopyalanamadı.");
      }
    }));
  }

  document.addEventListener("selectionchange", () => scheduleSelectionCapture(120));
  document.addEventListener("pointerup", event => {
    if (!event.target.closest?.("#sentence-save-toolbar")) scheduleSelectionCapture(60);
  });
  document.addEventListener("touchend", event => {
    if (!event.target.closest?.("#sentence-save-toolbar")) scheduleSelectionCapture(180);
  }, { passive: true });

  ensureToolbar();
  globalThis.savedLessonSentences = savedLessonSentences;
  globalThis.renderSavedSentences = renderSavedSentences;
  globalThis.clearSelectionToolbar = clearSelectionToolbar;
})();
