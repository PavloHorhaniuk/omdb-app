// ====== ENV ======
const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) ||
  window.API_BASE ||
  "";

if (!API_BASE) console.warn("VITE_API_BASE is empty");

// ====== NOTIFY ======
function notify(type, msg) {
  const box = document.createElement("div");
  box.className = `toast ${type}`;
  box.textContent = msg;
  document.body.appendChild(box);
  requestAnimationFrame(() => box.classList.add("show"));
  setTimeout(() => {
    box.classList.remove("show");
    setTimeout(() => box.remove(), 300);
  }, 3000);
}
const notifyOk = (m) => notify("success", m);
const notifyError = (m) => notify("error", m);

// ====== TOKENS ======
function getOrCreateUserToken() {
  let t = localStorage.getItem("omdbUserToken");
  if (!t) {
    t = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem("omdbUserToken", t);
  }
  return t;
}
function authHeaders() { return { "x-user-token": getOrCreateUserToken() }; }

// ====== HELPERS ======
async function safeJson(r) { try { return await r.json() } catch { return null } }
function escapeHtml(s = "") { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") }
function escapeAttr(s = "") { return escapeHtml(s).replace(/`/g, "\\`") }
function clearFieldErrors(form) { form.querySelectorAll(".invalid").forEach(el => el.classList.remove("invalid")) }
function highlightFormErrors(form, errors = []) {
  clearFieldErrors(form);
  if (!Array.isArray(errors)) return;
  for (const e of errors) {
    const field = e?.field;
    const el = form.querySelector(`[name="${field}"]`) || form.querySelector(`[data-field="${field}"]`);
    if (el) el.classList.add("invalid");
  }
}
function absoluteUploadUrl(pathLike) {
  if (!pathLike) return null;
  return pathLike.startsWith("/") ? `${API_BASE}${pathLike}` : pathLike;
}
async function wakeServer() { try { await fetch(`${API_BASE}/health`, { cache: "no-store" }); } catch { } }

// ====== DOM refs ======
const galleryEl = document.querySelector(".gallery");
const searchForm = document.getElementById("search-form");
const addBtn = document.getElementById("add-card-btn");
const myBtn = document.getElementById("my-cards-btn");
const pubBtn = document.getElementById("public-cards-btn");
const loadMoreBtn = document.getElementById("load-more");

// ====== MODES & PAGINATION STATE ======
let mode = "public";                 // "public" | "omdb"
let omdbQuery = "";                  // поточний OMDb запит
let omdbType = "";                  // тип (movie/series/episode)
let omdbYear = "";                  // рік
let omdbPage = 1;                   // сторінка OMDb
let omdbHasMore = false;

let publicPage = 1;                  // сторінка публічних карток
let publicHasMore = true;            // доки сервер каже, що є

const PAGE_SIZE = 12;

// ====== INIT ======
(() => {
  getOrCreateUserToken();
  // Стартуємо з публічних карток
  switchToPublic(true);
})();

// ====== SWITCHERS ======
pubBtn?.addEventListener("click", () => switchToPublic(true));
searchForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = searchForm.querySelector('[name="query"]').value.trim();
  omdbType = searchForm.querySelector('[name="type"]').value.trim();
  omdbYear = searchForm.querySelector('[name="year"]').value.trim();
  switchToOmdb(q, true);
});

function switchToPublic(reset) {
  mode = "public";
  loadMoreBtn.style.display = "inline-block";
  if (reset) {
    publicPage = 1;
    publicHasMore = true;
    galleryEl.innerHTML = "";
  }
  loadPublicCards();
}

function switchToOmdb(query, reset) {
  mode = "omdb";
  omdbQuery = query;
  loadMoreBtn.style.display = "inline-block";
  if (reset) {
    omdbPage = 1;
    omdbHasMore = false;
    galleryEl.innerHTML = "";
  }
  doSearch(omdbQuery, omdbPage, reset);
}

// ====== LOAD MORE ======
loadMoreBtn?.addEventListener("click", async () => {
  if (mode === "public") {
    if (!publicHasMore) { notify("info", "Більше карток немає"); return; }
    publicPage += 1;
    await loadPublicCards();
  } else {
    if (!omdbHasMore) { notify("info", "Більше результатів немає"); return; }
    omdbPage += 1;
    await doSearch(omdbQuery, omdbPage, false);
  }
});

// ====== RENDER MIX ======
function renderUserCards(items, append = true) {
  if (!galleryEl) return;
  if (!append) galleryEl.innerHTML = "";
  for (const c of items) {
    const li = document.createElement("li");
    li.className = "photo-card";
    const img = document.createElement("img");
    if (c.payload.imageUrl) {
      img.src = absoluteUploadUrl(c.payload.imageUrl);
    } else {
      img.src = "";
    }
    img.alt = c.payload.title || "";
    img.loading = "lazy";

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = c.payload.title || "(без назви)";

    const meta = document.createElement("div");
    meta.className = "card-sub";
    meta.textContent = `${c.payload.movieTitle || ""} • ${c.payload.name || ""}`;

    const row = document.createElement("div");
    row.className = "stats";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "user";
    row.append(badge);

    li.append(img, title, meta, row);
    galleryEl.append(li);
  }
}

function renderMovies(list, append = true) {
  if (!galleryEl) return;
  if (!append) galleryEl.innerHTML = "";
  for (const m of list) {
    const li = document.createElement("li");
    li.className = "photo-card";
    const img = document.createElement("img");
    img.src = m.Poster && m.Poster !== "N/A" ? m.Poster : "";
    img.alt = m.Title || "";
    img.loading = "lazy";
    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = `${m.Title || "No title"} ${m.Year ? `(${m.Year})` : ""}`;
    const meta = document.createElement("div");
    meta.className = "card-sub";
    meta.textContent = m.Type || "movie";
    const row = document.createElement("div");
    row.className = "stats";
    const btn = document.createElement("button");
    btn.className = "btn reviews-btn";
    btn.textContent = "Відгуки";
    btn.addEventListener("click", () => openCommentsModal(m.imdbID, m.Title));
    row.append(btn);
    li.append(img, title, meta, row);
    galleryEl.append(li);
  }
}

// ====== PUBLIC CARDS API ======
async function loadPublicCards() {
  try {
    await wakeServer();
    const url = new URL(`${API_BASE}/cards`);
    url.searchParams.set("onlyPublic", "true");
    url.searchParams.set("page", String(publicPage));
    url.searchParams.set("limit", String(PAGE_SIZE));
    const r = await fetch(url.toString());
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);

    renderUserCards(data.data || [], true);
    // Has more?
    const shown = publicPage * PAGE_SIZE;
    publicHasMore = shown < (data.total || 0);
    loadMoreBtn.style.display = publicHasMore ? "inline-block" : "none";

    if (publicPage === 1 && (!data.data || data.data.length === 0)) {
      notify("info", "Поки що публічних карток немає");
    }
  } catch (e) {
    console.error(e);
    notifyError(`Помилка завантаження публічних карток: ${e.message || e}`);
  }
}

// ====== OMDB SEARCH ======
async function doSearch(q, page = 1, reset = false) {
  if (!q) {
    notify("info", "Введи запит у полі пошуку");
    return;
  }
  try {
    await wakeServer();
    const url = new URL(`${API_BASE}/proxy/omdb`);
    url.searchParams.set("q", q);
    url.searchParams.set("page", String(page));
    if (omdbType) url.searchParams.set("type", omdbType);
    if (omdbYear) url.searchParams.set("y", omdbYear);

    const r = await fetch(url.toString());
    const data = await r.json();
    if (!r.ok || data?.Error) throw new Error(data?.error || data?.Error || `HTTP ${r.status}`);

    const list = data.Search || [];
    renderMovies(list, !reset);

    // omdb has up to ~10 results per page by default; визначимо hasMore:
    const total = Number(data.totalResults || 0);
    omdbHasMore = (page * list.length) < total;
    loadMoreBtn.style.display = omdbHasMore ? "inline-block" : "none";

    if (reset && list.length === 0) notify("info", "Нічого не знайдено");
  } catch (e) {
    console.error(e);
    notifyError(`Помилка запиту: ${e.message || e}`);
  }
}

// ====== COMMENTS (простий варіант) ======
async function openCommentsModal(imdbID, title) {
  const wrap = document.createElement("div");
  wrap.className = "modal";
  wrap.innerHTML = `
    <h2>Відгуки: ${escapeHtml(title)}</h2>
    <div id="comments-list"></div>
    <form class="comment-form" id="comment-form">
      <input type="text" name="name" placeholder="Ваше ім’я" />
      <textarea name="message" placeholder="Ваш відгук"></textarea>
      <label>Оцінка:
        <select name="rating">
          <option>5</option><option>4</option><option>3</option><option>2</option><option>1</option>
        </select>
      </label>
      <div class="row gap">
        <button type="submit" class="btn btn-primary">Надіслати</button>
        <button type="button" class="btn" id="close-modal">Закрити</button>
      </div>
    </form>
  `;
  const overlay = openLightbox(wrap);
  const listEl = wrap.querySelector("#comments-list");
  const form = wrap.querySelector("#comment-form");
  wrap.querySelector("#close-modal").onclick = overlay.close;

  await load();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const payload = {
      kind: "comment",
      imdbID,
      name: form.name.value.trim(),
      message: form.message.value.trim(),
      rating: Number(form.rating.value) || 5
    };
    try {
      const r = await fetch(`${API_BASE}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await safeJson(r);
      if (!r.ok) {
        highlightFormErrors(form, data?.errors);
        throw new Error(data?.error || `HTTP ${r.status}`);
      }
      form.reset();
      await load();
      notifyOk("Коментар додано");
    } catch (e) {
      notifyError(`Не вдалося додати: ${e.message || e}`);
    }
  });

  async function load() {
    const r = await fetch(`${API_BASE}/comments?imdbID=${encodeURIComponent(imdbID)}`);
    const data = await r.json();
    listEl.innerHTML = (data.data || []).map(c => `
      <div class="comment">
        <div class="meta">${escapeHtml(c.payload.name)} • ${new Date(c.createdAt).toLocaleString()} • <span class="rating">★${c.payload.rating}</span></div>
        <div class="text">${escapeHtml(c.payload.message)}</div>
      </div>
    `).join("");
  }
}

// ====== CREATE / MY CARDS (з аплоудом) ======
addBtn?.addEventListener("click", openCreateCard);
myBtn?.addEventListener("click", openMyCards);

function openCreateCard() {
  const wrap = document.createElement("div");
  wrap.className = "modal";
  wrap.innerHTML = `
    <h2>Створити власну картку</h2>
    <form class="comment-form" id="create-card-form" autocomplete="off">
      <input type="text" name="name" placeholder="Ваше ім’я" />
      <input type="text" name="movieTitle" placeholder="Назва фільму" />
      <input type="text" name="title" placeholder="Заголовок" />
      <textarea name="description" placeholder="Опис"></textarea>

      <div class="muted">Зображення (один із варіантів):</div>
      <input type="url"  name="imageUrl"  placeholder="Посилання на зображення (необов’язково)" />
      <input type="file" name="imageFile" accept="image/*" />

      <div class="preview" data-field="image"></div>

      <label class="row gap" style="margin-top:4px;">
        <input type="checkbox" name="isPublic" />
        <span>Зробити публічною</span>
      </label>

      <div class="row gap">
        <button type="submit" class="btn btn-primary">Створити</button>
        <button type="button" class="btn" id="cancel-create">Скасувати</button>
      </div>
    </form>
  `;
  const overlay = openLightbox(wrap);
  const form = wrap.querySelector("#create-card-form");
  const fileInput = form.querySelector('[name="imageFile"]');
  const preview = form.querySelector(".preview");
  wrap.querySelector("#cancel-create").onclick = overlay.close;

  fileInput.addEventListener("change", () => {
    preview.innerHTML = "";
    const f = fileInput.files?.[0];
    if (f) {
      const img = document.createElement("img");
      img.src = URL.createObjectURL(f);
      preview.append(img);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);

    const name = form.name.value.trim();
    const movieTitle = form.movieTitle.value.trim();
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const isPublic = form.isPublic.checked;
    const urlInput = form.imageUrl.value.trim();
    const file = fileInput.files?.[0];

    let imageUrl = urlInput || null;

    try {
      await wakeServer();
      if (file) {
        imageUrl = await uploadImage(file);
        imageUrl = absoluteUploadUrl(imageUrl);
      }

      const payload = { name, movieTitle, title, description, isPublic };
      if (imageUrl) payload.imageUrl = imageUrl;

      const r = await fetch(`${API_BASE}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await safeJson(r);
      if (!r.ok) {
        highlightFormErrors(form, data?.errors);
        throw new Error(data?.error || `HTTP ${r.status}`);
      }
      notifyOk("Картку створено");
      overlay.close();

      // якщо ми в публічному режимі і картка публічна — перезавантажимо стрічку з початку
      if (mode === "public" && isPublic) {
        switchToPublic(true);
      }
    } catch (e) {
      notifyError(`Помилка створення: ${e.message || e}`);
    }
  });
}

async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file); // ключ має бути "image"
  const r = await fetch(`${API_BASE}/upload`, { method: "POST", body: form });
  const data = await safeJson(r);
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data.url; // /uploads/....
}

async function openMyCards() {
  const wrap = document.createElement("div");
  wrap.className = "modal modal-wide";
  wrap.innerHTML = `
    <h2>Мої картки</h2>
    <div id="cards-list" class="list"></div>
    <div class="row gap" style="margin-top:10px;">
      <button class="btn" id="close-modal">Закрити</button>
    </div>
  `;
  const overlay = openLightbox(wrap);
  wrap.querySelector("#close-modal").onclick = overlay.close;
  const list = wrap.querySelector("#cards-list");
  await load();

  async function load() {
    const r = await fetch(`${API_BASE}/cards`, { headers: authHeaders() });
    const data = await r.json();
    list.innerHTML = (data.data || []).map(renderCardRow).join("");
    attachRowHandlers();
  }

  function renderCardRow(c) {
    const img = c.payload.imageUrl
      ? `<img src="${escapeAttr(absoluteUploadUrl(c.payload.imageUrl))}" alt="" />`
      : `<div class="noimg">—</div>`;
    return `
      <div class="card-row" data-id="${c.id}">
        <div class="thumb">${img}</div>
        <div class="info">
          <div class="t">${escapeHtml(c.payload.title)}</div>
          <div class="sub">${escapeHtml(c.payload.movieTitle)} • ${escapeHtml(c.payload.name)} • ${new Date(c.updatedAt).toLocaleString()}</div>
          <div class="desc">${escapeHtml(c.payload.description)}</div>
        </div>
        <div class="actions">
          <button class="btn edit">Редагувати</button>
          <button class="btn btn-danger remove">Видалити</button>
        </div>
      </div>
    `;
  }

  function attachRowHandlers() {
    list.querySelectorAll(".remove").forEach(btn => btn.addEventListener("click", async (e) => {
      const row = e.target.closest(".card-row");
      const id = row.dataset.id;
      if (!confirm("Видалити картку?")) return;
      const r = await fetch(`${API_BASE}/cards/${id}`, { method: "DELETE", headers: authHeaders() });
      const d = await safeJson(r);
      if (!r.ok) return notifyError(d?.error || `HTTP ${r.status}`);
      notifyOk("Видалено");
      await load();
    }));

    list.querySelectorAll(".edit").forEach(btn => btn.addEventListener("click", async (e) => {
      const row = e.target.closest(".card-row");
      openEditCard(row.dataset.id);
    }));
  }

  async function openEditCard(id) {
    const r = await fetch(`${API_BASE}/cards`, { headers: authHeaders() });
    const data = await r.json();
    const card = (data.data || []).find(x => x.id === id);
    if (!card) return notifyError("Картку не знайдено");

    const w = document.createElement("div");
    w.className = "modal";
    w.innerHTML = `
      <h2>Редагувати картку</h2>
      <form class="comment-form" id="edit-card-form" autocomplete="off">
        <input type="text" name="name" value="${escapeAttr(card.payload.name)}" placeholder="Ваше ім’я" />
        <input type="text" name="movieTitle" value="${escapeAttr(card.payload.movieTitle)}" placeholder="Назва фільму" />
        <input type="text" name="title" value="${escapeAttr(card.payload.title)}" placeholder="Заголовок" />
        <textarea name="description" placeholder="Опис">${escapeHtml(card.payload.description)}</textarea>

        <div class="muted">Зображення (один із варіантів):</div>
        <input type="url" name="imageUrl" value="${escapeAttr(absoluteUploadUrl(card.payload.imageUrl) || "")}" placeholder="Посилання на зображення (необов’язково)" />
        <input type="file" name="imageFile" accept="image/*" />
        <div class="preview" data-field="image">
          ${card.payload.imageUrl ? `<img src="${escapeAttr(absoluteUploadUrl(card.payload.imageUrl))}" alt="">` : ""}
        </div>

        <label class="row gap" style="margin-top:4px;">
          <input type="checkbox" name="isPublic" ${card.payload.isPublic ? "checked" : ""}/>
          <span>Публічна</span>
        </label>

        <div class="row gap">
          <button type="submit" class="btn btn-primary">Зберегти</button>
          <button type="button" class="btn" id="cancel-edit">Скасувати</button>
        </div>
      </form>
    `;
    const ov = openLightbox(w);
    w.querySelector("#cancel-edit").onclick = ov.close;

    const form = w.querySelector("#edit-card-form");
    const fileInput = form.querySelector('[name="imageFile"]');
    const preview = form.querySelector(".preview");
    fileInput.addEventListener("change", () => {
      preview.innerHTML = "";
      const f = fileInput.files?.[0];
      if (f) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(f);
        preview.append(img);
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFieldErrors(form);

      const patch = {
        name: form.name.value.trim(),
        movieTitle: form.movieTitle.value.trim(),
        title: form.title.value.trim(),
        description: form.description.value.trim(),
        isPublic: form.isPublic.checked
      };

      let imageUrl = form.imageUrl.value.trim() || null;
      const file = fileInput.files?.[0];

      try {
        if (file) {
          imageUrl = await uploadImage(file);
          imageUrl = absoluteUploadUrl(imageUrl);
        }
        if (imageUrl) patch.imageUrl = imageUrl;
        else patch.imageUrl = null; // дозволяємо прибрати

        const r = await fetch(`${API_BASE}/cards/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(patch)
        });
        const data = await safeJson(r);
        if (!r.ok) {
          highlightFormErrors(form, data?.errors);
          throw new Error(data?.error || `HTTP ${r.status}`);
        }
        notifyOk("Збережено");
        ov.close();
        await load();

        // якщо картка стала публічною — оновимо стрічку public, якщо ми в ній
        if (mode === "public") switchToPublic(true);
      } catch (e) {
        notifyError(`Помилка збереження: ${e.message || e}`);
      }
    });
  }
}

// ====== Lightbox (простий) ======
function openLightbox(contentEl) {
  const overlay = document.createElement("div");
  overlay.className = "lb";
  const inner = document.createElement("div");
  inner.className = "lb-inner";
  inner.append(contentEl);
  overlay.append(inner);
  document.body.append(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  return { close };
}
