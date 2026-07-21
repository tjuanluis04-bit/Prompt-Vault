(function () {
  "use strict";

  const STORAGE_KEY = "pv_prompts_v1";
  const CATS_KEY = "pv_categories_v1";
  const DEFAULT_CATS = ["General", "Retratos", "Ilustración", "Copywriting", "Código"];

  let prompts = [];
  let categories = [];
  let state = { type: "todos", cat: "__all__", search: "", editingId: null };

  // ---------- Persistencia ----------
  function loadAll() {
    try { prompts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch (e) { prompts = []; }
    try { categories = JSON.parse(localStorage.getItem(CATS_KEY)) || []; }
    catch (e) { categories = []; }
    if (!categories.length) categories = DEFAULT_CATS.slice();
  }
  function savePrompts() { localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts)); }
  function saveCategories() { localStorage.setItem(CATS_KEY, JSON.stringify(categories)); }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function escapeHtml(str) {
    return (str || "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  // ---------- Elementos ----------
  const cardList = document.getElementById("cardList");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");
  const categoryScroller = document.getElementById("categoryScroller");
  const typeChips = document.querySelectorAll(".type-chip");

  const menuBtn = document.getElementById("menuBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  const manageCatsBtn = document.getElementById("manageCatsBtn");

  const addBtn = document.getElementById("addBtn");
  const formOverlay = document.getElementById("formOverlay");
  const promptForm = document.getElementById("promptForm");
  const formTitle = document.getElementById("formTitle");
  const typeSegment = document.getElementById("typeSegment");
  const catSelect = document.getElementById("catSelect");
  const newCatBtn = document.getElementById("newCatBtn");
  const titleInput = document.getElementById("titleInput");
  const promptInput = document.getElementById("promptInput");
  const imageField = document.getElementById("imageField");
  const imageDrop = document.getElementById("imageDrop");
  const imageDropText = document.getElementById("imageDropText");
  const imageInput = document.getElementById("imageInput");
  const imagePreview = document.getElementById("imagePreview");
  const removeImageBtn = document.getElementById("removeImageBtn");
  const cancelFormBtn = document.getElementById("cancelFormBtn");

  const viewOverlay = document.getElementById("viewOverlay");
  const viewContent = document.getElementById("viewContent");
  const closeViewBtn = document.getElementById("closeViewBtn");
  const copyFromViewBtn = document.getElementById("copyFromViewBtn");

  const toast = document.getElementById("toast");

  let currentImageData = null; // base64 de la imagen en el formulario
  let viewingId = null;

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  // ---------- Copiado ----------
  async function copyText(text, onDone) {
    try {
      await navigator.clipboard.writeText(text);
      onDone && onDone(true);
      return;
    } catch (e) { /* fallback abajo */ }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      onDone && onDone(true);
    } catch (e) {
      onDone && onDone(false);
    }
  }

  // ---------- Render de categorías (filtro) ----------
  function renderCategoryScroller() {
    const used = new Set(categories);
    prompts.forEach((p) => used.add(p.category));
    const list = Array.from(used);

    categoryScroller.innerHTML = "";
    const allChip = document.createElement("button");
    allChip.className = "cat-chip" + (state.cat === "__all__" ? " active" : "");
    allChip.dataset.cat = "__all__";
    allChip.textContent = "Todas las categorías";
    categoryScroller.appendChild(allChip);

    list.forEach((cat) => {
      const chip = document.createElement("button");
      chip.className = "cat-chip" + (state.cat === cat ? " active" : "");
      chip.dataset.cat = cat;
      chip.textContent = cat;
      categoryScroller.appendChild(chip);
    });
  }

  categoryScroller.addEventListener("click", (e) => {
    const btn = e.target.closest(".cat-chip");
    if (!btn) return;
    state.cat = btn.dataset.cat;
    renderCategoryScroller();
    renderList();
  });

  typeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      typeChips.forEach((c) => { c.classList.remove("active"); c.setAttribute("aria-selected", "false"); });
      chip.classList.add("active");
      chip.setAttribute("aria-selected", "true");
      state.type = chip.dataset.type;
      renderList();
    });
  });

  searchInput.addEventListener("input", () => {
    state.search = searchInput.value.trim().toLowerCase();
    renderList();
  });

  // ---------- Render de tarjetas ----------
  function filteredPrompts() {
    return prompts
      .filter((p) => state.type === "todos" || p.type === state.type)
      .filter((p) => state.cat === "__all__" || p.category === state.cat)
      .filter((p) => {
        if (!state.search) return true;
        const hay = (p.title + " " + p.text + " " + p.category).toLowerCase();
        return hay.includes(state.search);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  function renderList() {
    const items = filteredPrompts();
    cardList.innerHTML = "";
    emptyState.hidden = items.length > 0;

    items.forEach((p) => {
      const card = document.createElement("article");
      card.className = "p-card";
      card.dataset.id = p.id;

      const thumb = p.type === "imagen" && p.image
        ? `<img class="p-thumb" src="${p.image}" alt="Imagen adjunta">`
        : "";

      card.innerHTML = `
        <span class="p-tab">${escapeHtml(p.category)}</span>
        <div class="p-head">
          <h3 class="p-title">${escapeHtml(p.title) || (p.type === "imagen" ? "Prompt de imagen" : "Prompt de texto")}</h3>
          <span class="p-stamp ${p.type}">${p.type === "imagen" ? "Imagen" : "Texto"}</span>
        </div>
        ${thumb}
        <p class="p-text">${escapeHtml(p.text)}</p>
        <div class="p-footer">
          <button type="button" class="p-btn" data-action="edit">Editar</button>
          <button type="button" class="p-btn" data-action="delete">Eliminar</button>
          <button type="button" class="p-btn copy" data-action="copy">Copiar</button>
        </div>
      `;
      cardList.appendChild(card);
    });
  }

  cardList.addEventListener("click", (e) => {
    const actionBtn = e.target.closest("[data-action]");
    const card = e.target.closest(".p-card");
    if (!card) return;
    const id = card.dataset.id;
    const item = prompts.find((p) => p.id === id);
    if (!item) return;

    if (actionBtn) {
      const action = actionBtn.dataset.action;
      e.stopPropagation();
      if (action === "copy") {
        copyText(item.text, (ok) => {
          if (ok) {
            actionBtn.textContent = "¡Copiado!";
            actionBtn.classList.add("copied");
            showToast("Prompt copiado al portapapeles");
            setTimeout(() => { actionBtn.textContent = "Copiar"; actionBtn.classList.remove("copied"); }, 1400);
          } else {
            showToast("No se pudo copiar");
          }
        });
      } else if (action === "edit") {
        openForm(item);
      } else if (action === "delete") {
        if (confirm("¿Eliminar este prompt del fichero?")) {
          prompts = prompts.filter((p) => p.id !== id);
          savePrompts();
          renderCategoryScroller();
          renderList();
          showToast("Prompt eliminado");
        }
      }
      return;
    }
    openView(item);
  });

  // ---------- Vista ampliada ----------
  function openView(item) {
    viewingId = item.id;
    const thumb = item.type === "imagen" && item.image
      ? `<img class="p-thumb" src="${item.image}" alt="Imagen adjunta">`
      : "";
    viewContent.innerHTML = `
      <span class="p-stamp ${item.type}">${item.type === "imagen" ? "Imagen" : "Texto"}</span>
      <h2 style="margin:4px 0 10px;">${escapeHtml(item.title) || (item.type === "imagen" ? "Prompt de imagen" : "Prompt de texto")}</h2>
      ${thumb}
      <p class="p-text">${escapeHtml(item.text)}</p>
      <p class="view-meta">Categoría: ${escapeHtml(item.category)}</p>
    `;
    viewOverlay.hidden = false;
  }
  closeViewBtn.addEventListener("click", () => { viewOverlay.hidden = true; viewingId = null; });
  viewOverlay.addEventListener("click", (e) => { if (e.target === viewOverlay) { viewOverlay.hidden = true; viewingId = null; } });
  copyFromViewBtn.addEventListener("click", () => {
    const item = prompts.find((p) => p.id === viewingId);
    if (!item) return;
    copyText(item.text, (ok) => showToast(ok ? "Prompt copiado al portapapeles" : "No se pudo copiar"));
  });

  // ---------- Menú desplegable ----------
  menuBtn.addEventListener("click", () => {
    const willShow = dropdownMenu.hidden;
    dropdownMenu.hidden = !willShow;
    menuBtn.setAttribute("aria-expanded", String(willShow));
  });
  document.addEventListener("click", (e) => {
    if (!dropdownMenu.hidden && !dropdownMenu.contains(e.target) && e.target !== menuBtn) {
      dropdownMenu.hidden = true;
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });

  exportBtn.addEventListener("click", () => {
    const data = JSON.stringify({ prompts, categories }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promptvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    dropdownMenu.hidden = true;
    showToast("Copia exportada");
  });

  importBtn.addEventListener("click", () => { importFile.click(); dropdownMenu.hidden = true; });
  importFile.addEventListener("change", () => {
    const file = importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.prompts)) {
          const existingIds = new Set(prompts.map((p) => p.id));
          const incoming = data.prompts.filter((p) => !existingIds.has(p.id));
          prompts = prompts.concat(incoming);
          savePrompts();
        }
        if (Array.isArray(data.categories)) {
          categories = Array.from(new Set(categories.concat(data.categories)));
          saveCategories();
        }
        renderCategoryScroller();
        renderList();
        showToast("Copia importada");
      } catch (e) {
        showToast("Archivo no válido");
      }
    };
    reader.readAsText(file);
    importFile.value = "";
  });

  manageCatsBtn.addEventListener("click", () => {
    dropdownMenu.hidden = true;
    const name = prompt("Escribe el nombre de la categoría que quieres añadir:");
    if (name && name.trim()) {
      const clean = name.trim();
      if (!categories.includes(clean)) {
        categories.push(clean);
        saveCategories();
        renderCategoryScroller();
        showToast(`Categoría "${clean}" añadida`);
      } else {
        showToast("Esa categoría ya existe");
      }
    }
  });

  // ---------- Formulario ----------
  function populateCatSelect(selected) {
    const used = new Set(categories);
    prompts.forEach((p) => used.add(p.category));
    catSelect.innerHTML = "";
    Array.from(used).forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      catSelect.appendChild(opt);
    });
    if (selected) catSelect.value = selected;
  }

  function setFormType(type) {
    typeSegment.querySelectorAll(".seg-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.value === type);
    });
    imageField.hidden = type !== "imagen";
  }
  typeSegment.addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    setFormType(btn.dataset.value);
  });

  newCatBtn.addEventListener("click", () => {
    const name = prompt("Nombre de la nueva categoría:");
    if (name && name.trim()) {
      const clean = name.trim();
      if (!categories.includes(clean)) { categories.push(clean); saveCategories(); }
      populateCatSelect(clean);
    }
  });

  function resetForm() {
    state.editingId = null;
    formTitle.textContent = "Nuevo prompt";
    setFormType("imagen");
    populateCatSelect(categories[0]);
    titleInput.value = "";
    promptInput.value = "";
    currentImageData = null;
    imagePreview.hidden = true;
    imagePreview.src = "";
    imageDropText.hidden = false;
    removeImageBtn.hidden = true;
  }

  function openForm(item) {
    resetForm();
    if (item) {
      state.editingId = item.id;
      formTitle.textContent = "Editar prompt";
      setFormType(item.type);
      populateCatSelect(item.category);
      titleInput.value = item.title || "";
      promptInput.value = item.text || "";
      if (item.image) {
        currentImageData = item.image;
        imagePreview.src = item.image;
        imagePreview.hidden = false;
        imageDropText.hidden = true;
        removeImageBtn.hidden = false;
      }
    }
    formOverlay.hidden = false;
  }

  addBtn.addEventListener("click", () => openForm(null));
  cancelFormBtn.addEventListener("click", () => { formOverlay.hidden = true; });
  formOverlay.addEventListener("click", (e) => { if (e.target === formOverlay) formOverlay.hidden = true; });

  imageDrop.addEventListener("click", () => imageInput.click());
  imageInput.addEventListener("change", () => {
    const file = imageInput.files[0];
    if (!file) return;
    compressImage(file, 900, 0.72).then((dataUrl) => {
      currentImageData = dataUrl;
      imagePreview.src = dataUrl;
      imagePreview.hidden = false;
      imageDropText.hidden = true;
      removeImageBtn.hidden = false;
    }).catch(() => showToast("No se pudo procesar la imagen"));
  });
  removeImageBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    currentImageData = null;
    imagePreview.hidden = true;
    imagePreview.src = "";
    imageDropText.hidden = false;
    removeImageBtn.hidden = true;
    imageInput.value = "";
  });

  function compressImage(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement("canvas");
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  promptForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = typeSegment.querySelector(".seg-btn.active").dataset.value;
    const text = promptInput.value.trim();
    if (!text) { showToast("Escribe el prompt antes de guardar"); return; }

    const payload = {
      type,
      category: catSelect.value || "General",
      title: titleInput.value.trim(),
      text,
      image: type === "imagen" ? currentImageData : null,
    };

    if (state.editingId) {
      const idx = prompts.findIndex((p) => p.id === state.editingId);
      if (idx > -1) prompts[idx] = { ...prompts[idx], ...payload };
      showToast("Prompt actualizado");
    } else {
      prompts.push({ id: uid(), createdAt: Date.now(), ...payload });
      showToast("Prompt archivado");
    }
    savePrompts();
    formOverlay.hidden = true;
    renderCategoryScroller();
    renderList();
  });

  // ---------- Init ----------
  loadAll();
  renderCategoryScroller();
  renderList();
})();
