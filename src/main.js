// ====== ENV & CONSTANTS ======
const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE) ||
  window.API_BASE ||
  "";

if (!API_BASE) {
  console.warn("VITE_API_BASE is empty. Set it in .env or .env.production");
}

// ====== SIMPLE NOTIFY (PNotify-лайт) ======
function notify(type, msg) {
  // type: success | error | info
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

// ====== TOKEN (x-user-token) ======
function getOrCreateUserToken() {
  let t = localStorage.getItem("omdbUserToken");
  if (!t) {
    t = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem("omdbUserToken", t);
  }
  return t;
}
function authHeaders() {
  return { "x-user-token": getOrCreateUserToken() };
}

// ====== HELPERS ======
async function safeJson(r) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
function clearFieldErrors(form) {
  form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
}
function highlightFormErrors(form, errors = []) {
  clearFieldErrors(form);
  if (!Array.isArray(errors)) return;
  for (const err of errors) {
    const field = err?.field;
    if (!field) continue;
    const el =
      form.querySelector(`[name="${field}"]`) ||
      form.querySelector(`[data-field="${field}"]`);
    if (el) el.classList.add("invalid");
  }
}
function absoluteUploadUrl(pathLike) {
  if (!pathLike) return null;
  return pathLike.startsWith("/")
    ? `${API_BASE}${pathLike}`
    : pathLike;
}

// ====== UI ROOTS ======
const galleryEl = document.querySelector(".gallery");
const addBtn = document.getElementById("add-card-btn") || createAddButtons();

// Create minimal UI if missing (for safety)
function createAddButtons() {
  const bar = document.createElement("div");
  bar.className = "controls";
  const btn1 = document.createElement("button");
  btn1.id = "add-card-btn";
  btn1.className = "btn btn-primary";
  btn1.textContent = "Додати картку";
  const btn2 = document.createElement("button");
  btn2.id = "my-cards-btn";
  btn2.className = "btn";
  btn2.textContent = "Мої картки";
  bar.append(btn1, btn2);
  document.body.prepend(bar);
  return btn1;
}

// ====== OMDb (для пошуку) — базовий рендер ======
const searchForm = document.getElementById("search-form");
if (searchForm) {
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const q = searchForm.querySelector('[name="query"]').value.trim();
    await doSearch(q);
  });
}

async function doSearch(q, page = 1) {
  if (!q) return;
  try {
    await wakeServer();
    const url = new URL(`${API_BASE}/proxy/omdb`);
    url.searchParams.set("q", q);
    url.searchParams.set("page", String(page));
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok || data?.Error) {
      throw new Error(data?.error || data?.Error || `HTTP ${r.status}`);
    }
    renderMovies(data.Search || []);
    notifyOk("Готово");
  } catch (e) {
    console.error(e);
    notifyError(`Помилка запиту: ${e.message || e}`);
  }
}

function renderMovies(list) {
  if (!galleryEl) return;
  galleryEl.innerHTML = "";
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

// ====== COMMENTS (мінімально — тільки перегляд/додавання) ======
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

  await loadComments();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const name = form.name.value.trim();
    const message = form.message.value.trim();
    const rating = Number(form.rating.value) || 5;
    const payload = { kind: "comment", imdbID, name, message, rating };

    try {
      const r = await fetch(`${API_BASE}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await safeJson(r);
      if (!r.ok) {
        highlightFormErrors(form, data?.errors);
        throw new Error(data?.error || `HTTP ${r.status}`);
      }
      form.reset();
      await loadComments();
      notifyOk("Коментар додано");
    } catch (e) {
      notifyError(`Не вдалося додати: ${e.message || e}`);
    }
  });

  async function loadComments() {
    const r = await fetch(`${API_BASE}/comments?imdbID=${encodeURIComponent(imdbID)}`, {
      headers: authHeaders(),
    });
    const data = await r.json();
    listEl.innerHTML = (data.data || [])
      .map(
        (c) => `
        <div class="comment">
          <div class="meta">${escapeHtml(c.payload.name)} • ${new Date(c.createdAt).toLocaleString()} • <span class="rating">★${c.payload.rating}</span></div>
          <div class="text">${escapeHtml(c.payload.message)}</div>
        </div>`
      )
      .join("");
  }
}

// ====== ADD USER CARD (З АПЛОУДОМ ФОТО) ======
document.getElementById("add-card-btn")?.addEventListener("click", openCreateCard);

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
      <input type="url" name="imageUrl" placeholder="Посилання на зображення (необов’язково)" />
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

      <div class="muted">Зображення з файлу зберігається на сервері. URL можна вставити зовнішній (imgur тощо).</div>
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

      // Якщо обрали файл — спочатку аплоудимо
      if (file) {
        imageUrl = await uploadImage(file); // повертає /uploads/.... на бекенді
        imageUrl = absoluteUploadUrl(imageUrl);
      }

      // Збираємо payload (imageUrl необов'язкове)
      const payload = { name, movieTitle, title, description, isPublic };
      if (imageUrl) payload.imageUrl = imageUrl;

      const r = await fetch(`${API_BASE}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await safeJson(r);
      if (!r.ok) {
        highlightFormErrors(form, data?.errors);
        throw new Error(data?.error || `HTTP ${r.status}`);
      }
      notifyOk("Картку створено");
      overlay.close();
      // за бажанням — онови мої картки
    } catch (e) {
      notifyError(`Помилка створення: ${e.message || e}`);
    }
  });
}

async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file); // ВАЖЛИВО: ключ має бути "image"
  const r = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: form, // НЕ ставимо Content-Type вручну!
  });
  const data = await safeJson(r);
  if (!r.ok) {
    throw new Error(data?.error || `HTTP ${r.status}`);
  }
  return data.url; // типу: /uploads/xxxxx.webp
}

// ====== MY CARDS (список) ======
document.getElementById("my-cards-btn")?.addEventListener("click", openMyCards);

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
    list.innerHTML = (data.data || [])
      .map((c) => renderCardRow(c))
      .join("");
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
    list.querySelectorAll(".remove").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const row = e.target.closest(".card-row");
        const id = row.dataset.id;
        if (!confirm("Видалити картку?")) return;
        const r = await fetch(`${API_BASE}/cards/${id}`, {
          method: "DELETE",
          headers: authHeaders(),
        });
        const d = await safeJson(r);
        if (!r.ok) return notifyError(d?.error || `HTTP ${r.status}`);
        notifyOk("Видалено");
        await load();
      })
    );

    list.querySelectorAll(".edit").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const row = e.target.closest(".card-row");
        const id = row.dataset.id;
        openEditCard(id);
      })
    );
  }

  async function openEditCard(id) {
    // підвантажимо актуальні дані
    const r = await fetch(`${API_BASE}/cards`, { headers: authHeaders() });
    const data = await r.json();
    const card = (data.data || []).find((x) => x.id === id);
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
          ${card.payload.imageUrl
        ? `<img src="${escapeAttr(absoluteUploadUrl(card.payload.imageUrl))}" alt="">`
        : ""
      }
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
        isPublic: form.isPublic.checked,
      };

      let imageUrl = form.imageUrl.value.trim() || null;
      const file = fileInput.files?.[0];
      try {
        if (file) {
          imageUrl = await uploadImage(file);
          imageUrl = absoluteUploadUrl(imageUrl);
        }
        if (imageUrl) patch.imageUrl = imageUrl;
        else patch.imageUrl = null; // дозволяємо прибрати картинку

        const r = await fetch(`${API_BASE}/cards/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(patch),
        });
        const data = await safeJson(r);
        if (!r.ok) {
          highlightFormErrors(form, data?.errors);
          throw new Error(data?.error || `HTTP ${r.status}`);
        }
        notifyOk("Збережено");
        ov.close();
        await load();
      } catch (e) {
        notifyError(`Помилка збереження: ${e.message || e}`);
      }
    });
  }
}

// ====== Lightbox (дуже простий) ======
function openLightbox(contentEl) {
  const overlay = document.createElement("div");
  overlay.className = "lb";
  const inner = document.createElement("div");
  inner.className = "lb-inner";
  inner.append(contentEl);
  overlay.append(inner);
  document.body.append(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  return { close };
}

// ====== small utils ======
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s = "") {
  return escapeHtml(s).replace(/`/g, "\\`");
}

// ====== wake server (Render free) ======
async function wakeServer() {
  try {
    await fetch(`${API_BASE}/health`, { cache: "no-store" });
  } catch { }
}

// ====== INIT (опційно авто-пошук) ======
(async () => {
  getOrCreateUserToken();
  // початковий пошук (для прикладу)
  const input = document.querySelector('#search-form input[name="query"]');
  if (input && input.value.trim()) {
    doSearch(input.value.trim());
  }
})();
