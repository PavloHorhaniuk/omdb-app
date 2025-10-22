import Handlebars from 'handlebars';
import * as basicLightbox from 'basiclightbox';
import 'basiclightbox/dist/basicLightbox.min.css';

import '@pnotify/core/dist/PNotify.css';
import '@pnotify/core/dist/BrightTheme.css';
import { alert } from '@pnotify/core';

import cardTplSrc from './templates/card.hbs?raw';
const cardTpl = Handlebars.compile(cardTplSrc);

// DOM
const form = document.getElementById('search-form');
const gallery = document.getElementById('gallery');
const btnMore = document.getElementById('load-more');
const addBtn = document.getElementById('add-card-btn');
const myBtn = document.getElementById('my-cards-btn');

// State
let query = ''; let page = 1; let totalResults = 0; let type = ''; let year = '';

// API base
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ------- tokens -------
const USER_TOKEN_KEY = 'omdbUserToken';
const USER_NAME_KEY = 'omdbUserName';
const ADMIN_TOKEN_KEY = 'omdbAdminToken'; // якщo хочеш адмініструвати з браузера
function getOrCreateUserToken() {
  let t = localStorage.getItem(USER_TOKEN_KEY);
  if (!t) {
    t = crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
    localStorage.setItem(USER_TOKEN_KEY, t);
  }
  return t;
}
const USER_TOKEN = getOrCreateUserToken();
const getSavedName = () => localStorage.getItem(USER_NAME_KEY) || '';
const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY) || '';

// ------- helpers -------
function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }
const normalizePoster = (u) => (!u || u === 'N/A') ? '' : u;
function authHeaders() {
  const h = { 'x-user-token': USER_TOKEN };
  const adm = getAdminToken();
  if (adm) h['x-admin-token'] = adm;
  return h;
}

// ================= OMDb via proxy =================
async function fetchMovies(q, pageNum, type, year) {
  try {
    const url = new URL(`${API_BASE}/proxy/omdb`);
    url.searchParams.set('q', q);
    url.searchParams.set('page', String(pageNum));
    if (type) url.searchParams.set('type', type);
    if (year) url.searchParams.set('y', year);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const hits = (data.Search || []).map(h => ({
      Title: h.Title, Year: h.Year, imdbID: h.imdbID, Type: h.Type,
      poster: normalizePoster(h.Poster), posterLarge: normalizePoster(h.Poster)
    }));
    totalResults = parseInt(data.totalResults || '0', 10) || 0;
    return { hits, totalResults };
  } catch (err) {
    alert({ text: `Помилка запиту: ${err.message}`, type: 'error', delay: 2000 });
    return { hits: [], totalResults: 0 };
  }
}
async function fetchById(imdbID) {
  const url = new URL(`${API_BASE}/proxy/omdb`); url.searchParams.set('i', imdbID);
  const res = await fetch(url); if (!res.ok) throw new Error(`HTTP ${res.status}`); return await res.json();
}

// ================= Comments API =================
async function getComments(imdbID, page = 1) {
  try {
    const url = new URL(`${API_BASE}/comments`); url.searchParams.set('imdbID', imdbID); url.searchParams.set('page', String(page)); url.searchParams.set('limit', '50');
    const res = await fetch(url, { headers: { 'x-user-token': USER_TOKEN } }); if (!res.ok) throw new Error(`HTTP ${res.status}`); return await res.json();
  } catch (err) { alert({ text: `Не вдалося отримати коментарі: ${err.message}`, type: 'error', delay: 2000 }); return { data: [], total: 0 }; }
}
async function addComment({ imdbID, name, message, rating = 5 }) {
  const res = await fetch(`${API_BASE}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-token': USER_TOKEN }, body: JSON.stringify({ imdbID, name, message, rating }) });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `HTTP ${res.status}`); }
  localStorage.setItem(USER_NAME_KEY, name);
  return await res.json();
}
async function updateComment(id, patch) {
  const res = await fetch(`${API_BASE}/comments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-user-token': USER_TOKEN }, body: JSON.stringify(patch) });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `HTTP ${res.status}`); }
  return await res.json();
}
async function deleteComment(id) {
  const res = await fetch(`${API_BASE}/comments/${id}`, { method: 'DELETE', headers: { 'x-user-token': USER_TOKEN } });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `HTTP ${res.status}`); }
  return await res.json();
}

// ================= User Cards API (with images) =================
async function uploadImage(file) {
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: fd });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `HTTP ${res.status}`); }
  return await res.json(); // {url, size, type, name}
}
async function createCard({ name, movieTitle, title, description, isPublic = false, imageUrl = null }) {
  const res = await fetch(`${API_BASE}/cards`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ name, movieTitle, title, description, isPublic, imageUrl }) });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `HTTP ${res.status}`); }
  return await res.json();
}
async function getMyCards() {
  const url = new URL(`${API_BASE}/cards`);
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
async function updateCard(id, patch) {
  const res = await fetch(`${API_BASE}/cards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify(patch) });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `HTTP ${res.status}`); }
  return await res.json();
}
async function deleteCard(id) {
  const res = await fetch(`${API_BASE}/cards/${id}`, { method: 'DELETE', headers: authHeaders() });
  if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `HTTP ${res.status}`); }
  return await res.json();
}

// ================= UI: search list =================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(form);
    const q = (fd.get('query') || '').toString().trim();
    type = (fd.get('type') || '').toString().trim();
    year = (fd.get('year') || '').toString().trim();
    if (!q) return;
    query = q; page = 1; gallery.innerHTML = ''; btnMore.hidden = true;
    await fetchAndRender();
  } catch (err) {
    alert({ text: `Помилка форми: ${err.message}`, type: 'error', delay: 2000 });
  }
});
btnMore.addEventListener('click', async () => { try { page += 1; await fetchAndRender(true); } catch (err) { alert({ text: `Помилка: ${err.message}`, type: 'error', delay: 2000 }); } });

gallery.addEventListener('click', async (e) => {
  const li = e.target.closest('.photo-card');
  if (!li || e.target.closest('.reviews-btn')) return;
  const imdbID = li.dataset.imdb; if (!imdbID) return;
  try {
    const data = await fetchById(imdbID);
    const poster = (data.Poster && data.Poster !== 'N/A') ? data.Poster : '';
    const html = `
      <div class="modal modal-wide">
        <h2>${escapeHtml(data.Title)} (${escapeHtml(data.Year)})</h2>
        <div class="grid2">
          <div>${poster ? `<img src="${poster}" alt="" class="poster-lg" />` : ''}</div>
          <div class="desc">
            <p><b>Type:</b> ${escapeHtml(data.Type || '')}</p>
            <p><b>Genre:</b> ${escapeHtml(data.Genre || '')}</p>
            <p><b>Rated:</b> ${escapeHtml(data.Rated || '')}</p>
            <p><b>Runtime:</b> ${escapeHtml(data.Runtime || '')}</p>
            <p><b>Director:</b> ${escapeHtml(data.Director || '')}</p>
            <p><b>Actors:</b> ${escapeHtml(data.Actors || '')}</p>
            <p><b>Plot:</b> ${escapeHtml(data.Plot || '')}</p>
            <p><a href="https://www.imdb.com/title/${imdbID}/" target="_blank" rel="noopener">Open on IMDb</a></p>
          </div>
        </div>
      </div>`;
    basicLightbox.create(html).show();
  } catch (_) { }
});
gallery.addEventListener('click', async (e) => {
  const btn = e.target.closest('.reviews-btn');
  if (!btn) return;
  const imdbID = btn.dataset.imdb || btn.closest('.photo-card')?.dataset.imdb;
  if (!imdbID) return;
  await openReviewsModal(imdbID);
});

async function fetchAndRender(append = false) {
  try {
    const { hits, totalResults: tr } = await fetchMovies(query, page, type, year);
    if (!hits.length) { if (!append) alert({ text: 'Нічого не знайдено', type: 'notice', delay: 1500 }); btnMore.hidden = true; return; }
    const markup = hits.map(cardTpl).join('');
    if (append) { gallery.insertAdjacentHTML('beforeend', markup); gallery.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }
    else { gallery.innerHTML = markup; }
    const already = page * 10; btnMore.hidden = already >= tr;
  } catch (err) {
    alert({ text: `Помилка рендера: ${err.message}`, type: 'error', delay: 2000 });
  }
}

// ===== Reviews modal (existing) =====
async function openReviewsModal(imdbID) {
  try {
    const { data } = await getComments(imdbID);
    const listHtml = data.map(c => {
      const p = c.payload || {};
      const stars = '★'.repeat(p.rating || 5);
      const ownerBtns = c.own
        ? `<div class="comment-actions">
             <button class="btn comment-edit" data-id="${c.id}">Редагувати</button>
             <button class="btn btn-danger comment-delete" data-id="${c.id}">Видалити</button>
           </div>` : '';
      return `
        <div class="comment" data-id="${c.id}">
          <div class="meta"><b>${escapeHtml(p.name)}</b> • ${new Date(c.createdAt).toLocaleString()} • <span class="rating">${stars}</span></div>
          <div class="text">${escapeHtml(p.message)}</div>
          ${ownerBtns}
        </div>`;
    }).join('');
    const savedName = getSavedName();
    const html = `
      <div class="modal">
        <h3>Відгуки • ${escapeHtml(imdbID)}</h3>
        <form class="comment-form" id="comment-form">
          <input type="text" name="name" placeholder="Ваше ім'я *" value="${escapeHtml(savedName)}" required />
          <textarea name="message" rows="3" placeholder="Ваш відгук *" required></textarea>
          <label>Оцінка:
            <select name="rating">
              <option value="5" selected>5</option><option value="4">4</option>
              <option value="3">3</option><option value="2">2</option><option value="1">1</option>
            </select>
          </label>
          <button class="btn btn-primary" type="submit">Надіслати</button>
        </form>
        <div id="comments-list">${listHtml || '<i>Поки що немає коментарів</i>'}</div>
      </div>`;
    const instance = basicLightbox.create(html, { closable: true }); instance.show();

    const modalEl = document.querySelector('.modal');
    const formEl = modalEl.querySelector('#comment-form');
    const listEl = modalEl.querySelector('#comments-list');

    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(formEl);
      const name = (fd.get('name') || '').toString().trim();
      const message = (fd.get('message') || '').toString().trim();
      const rating = parseInt(fd.get('rating') || '5', 10) || 5;
      if (!name || !message) { alert({ text: 'Ім’я та відгук обов’язкові', type: 'notice', delay: 1200 }); return; }
      try {
        const created = await addComment({ imdbID, name, message, rating });
        const p = created.payload; const stars = '★'.repeat(p.rating || 5);
        const node = document.createElement('div'); node.className = 'comment'; node.dataset.id = created.id;
        node.innerHTML = `
          <div class="meta"><b>${escapeHtml(p.name)}</b> • ${new Date(created.createdAt).toLocaleString()} • <span class="rating">${stars}</span></div>
          <div class="text">${escapeHtml(p.message)}</div>
          <div class="comment-actions">
            <button class="btn comment-edit" data-id="${created.id}">Редагувати</button>
            <button class="btn btn-danger comment-delete" data-id="${created.id}">Видалити</button>
          </div>`;
        listEl.insertAdjacentElement('afterbegin', node);
        formEl.reset(); alert({ text: 'Відгук додано!', type: 'success', delay: 1000 });
      } catch (_) { }
    });

    listEl.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('.comment-delete');
      const editBtn = e.target.closest('.comment-edit');
      if (delBtn) { const id = delBtn.dataset.id; try { await deleteComment(id); delBtn.closest('.comment')?.remove(); } catch (_) { } return; }
      if (editBtn) {
        const id = editBtn.dataset.id;
        const wrap = editBtn.closest('.comment');
        const meta = wrap.querySelector('.meta');
        const textEl = wrap.querySelector('.text');
        const curName = meta.querySelector('b')?.textContent?.trim() || getSavedName();
        const curMsg = textEl.textContent.trim();
        const curStars = (meta.querySelector('.rating')?.textContent || '★★★★★').length;
        if (wrap.querySelector('.edit-form')) return;
        const editForm = document.createElement('form');
        editForm.className = 'edit-form';
        editForm.innerHTML = `
          <input type="text" name="name" value="${escapeHtml(curName)}" required />
          <textarea name="message" rows="3" required>${escapeHtml(curMsg)}</textarea>
          <select name="rating">${[5, 4, 3, 2, 1].map(v => `<option value="${v}" ${v === curStars ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <div class="row gap"><button class="btn btn-primary" type="submit">Зберегти</button><button class="btn btn-ghost cancel-edit" type="button">Скасувати</button></div>`;
        wrap.appendChild(editForm);
        editForm.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const f = new FormData(editForm);
          const name = (f.get('name') || '').toString().trim();
          const message = (f.get('message') || '').toString().trim();
          const rating = parseInt(f.get('rating') || '5', 10) || 5;
          if (!name || !message) { alert({ text: 'Ім’я та відгук обов’язкові', type: 'notice', delay: 1200 }); return; }
          try {
            const updated = await updateComment(id, { name, message, rating });
            const p = updated.payload; const stars = '★'.repeat(p.rating || 5);
            meta.innerHTML = `<b>${escapeHtml(p.name)}</b> • ${new Date(updated.updatedAt).toLocaleString()} • <span class="rating">${stars}</span>`;
            textEl.textContent = p.message;
            editForm.remove(); alert({ text: 'Збережено!', type: 'success', delay: 900 });
          } catch (_) { }
        });
        editForm.querySelector('.cancel-edit')?.addEventListener('click', () => editForm.remove());
      }
    });
  } catch (err) {
    alert({ text: `Не вдалося відкрити відгуки: ${err.message}`, type: 'error', delay: 2000 });
  }
}

// ====== Add Card / My Cards (with image upload) ======
addBtn?.addEventListener('click', openAddCardModal);
myBtn?.addEventListener('click', openMyCardsModal);

function openAddCardModal() {
  const savedName = getSavedName();
  const html = `
    <div class="modal">
      <h3>Створити власну картку</h3>
      <form id="add-card-form" class="comment-form">
        <input type="text" name="name" placeholder="Ваше ім'я *" value="${escapeHtml(savedName)}" required />
        <input type="text" name="movieTitle" placeholder="Назва фільму *" required />
        <input type="text" name="title" placeholder="Заголовок картки *" required />
        <textarea name="description" rows="4" placeholder="Опис *" required></textarea>

        <label>Зображення (один із варіантів):</label>
        <input type="url" name="imageUrl" placeholder="Посилання на зображення (необов'язково)" />
        <input type="file" name="imageFile" accept="image/*" />
        <div class="preview" id="image-preview"></div>

        <label><input type="checkbox" name="isPublic" /> Зробити публічною</label>
        <div class="row gap">
          <button class="btn btn-primary" type="submit">Створити</button>
          <button class="btn btn-ghost" type="button" id="cancel-add-card">Скасувати</button>
        </div>
      </form>
      <p class="muted">Зображення з файлу зберігається на сервері. URL можна вставити зовнішній (Imgur тощо).</p>
    </div>`;
  const instance = basicLightbox.create(html); instance.show();

  const formEl = document.getElementById('add-card-form');
  const cancelBtn = document.getElementById('cancel-add-card');
  const fileInput = formEl.querySelector('input[name="imageFile"]');
  const urlInput = formEl.querySelector('input[name="imageUrl"]');
  const previewEl = document.getElementById('image-preview');

  const updatePreview = () => {
    previewEl.innerHTML = '';
    const url = urlInput.value.trim();
    const file = fileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { previewEl.innerHTML = `<img src="${reader.result}" alt="preview" />`; };
      reader.readAsDataURL(file);
    } else if (url) {
      previewEl.innerHTML = `<img src="${escapeHtml(url)}" alt="preview" />`;
    }
  };
  urlInput.addEventListener('input', updatePreview);
  fileInput.addEventListener('change', updatePreview);

  cancelBtn?.addEventListener('click', () => instance.close());

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(formEl);
    const name = (fd.get('name') || '').toString().trim();
    const movieTitle = (fd.get('movieTitle') || '').toString().trim();
    const title = (fd.get('title') || '').toString().trim();
    const description = (fd.get('description') || '').toString().trim();
    let imageUrl = (fd.get('imageUrl') || '').toString().trim();
    const isPublic = fd.get('isPublic') === 'on';

    if (!name || !movieTitle || !title || !description) {
      alert({ text: 'Заповніть усі обов’язкові поля.', type: 'notice', delay: 1400 }); return;
    }

    try {
      // Якщо вибрано файл — вантажимо його, і беремо повернутий url
      const file = fileInput.files?.[0];
      if (file) {
        const up = await uploadImage(file);
        // Якщо бекенд повернув відносний шлях /uploads/..., перетворимо на абсолютний для фронта на Pages:
        const base = API_BASE.replace(/\/$/, '');
        imageUrl = `${base}${up.url}`;
      }
      const card = await createCard({ name, movieTitle, title, description, isPublic, imageUrl: imageUrl || null });
      localStorage.setItem(USER_NAME_KEY, name);
      instance.close();
      alert({ text: 'Картку створено!', type: 'success', delay: 1000 });
      openMyCardsModal();
    } catch (err) {
      alert({ text: `Помилка створення: ${err.message}`, type: 'error', delay: 2000 });
    }
  });
}

async function openMyCardsModal() {
  try {
    const { data } = await getMyCards();
    const rows = data.map(c => {
      const p = c.payload;
      const img = p.imageUrl ? `<div class="preview"><img src="${escapeHtml(p.imageUrl)}" alt=""></div>` : '';
      return `
        <div class="comment" data-id="${c.id}">
          <div class="meta">
            <b>${escapeHtml(p.name)}</b> • ${escapeHtml(p.movieTitle)} • ${new Date(c.updatedAt).toLocaleString()} ${p.isPublic ? '• 🌐' : '• 🔒'}
          </div>
          ${img}
          <div class="text"><b>${escapeHtml(p.title)}</b><br>${escapeHtml(p.description)}</div>
          <div class="comment-actions">
            <button class="btn card-edit" data-id="${c.id}">Редагувати</button>
            <button class="btn btn-danger card-delete" data-id="${c.id}">Видалити</button>
          </div>
        </div>`;
    }).join('') || '<i>У вас ще немає карток</i>';

    const html = `<div class="modal"><h3>Мої картки</h3><div id="cards-list">${rows}</div></div>`;
    const instance = basicLightbox.create(html); instance.show();
    const list = document.getElementById('cards-list');

    list.addEventListener('click', async (e) => {
      const del = e.target.closest('.card-delete');
      const edit = e.target.closest('.card-edit');

      if (del) {
        const id = del.dataset.id;
        if (!confirm('Видалити картку?')) return;
        try { await deleteCard(id); del.closest('.comment')?.remove(); }
        catch (err) { alert({ text: `Помилка: ${err.message}`, type: 'error', delay: 1500 }); }
        return;
      }

      if (edit) {
        const id = edit.dataset.id;
        const wrap = edit.closest('.comment');
        if (wrap.querySelector('.edit-form')) return;

        const meta = wrap.querySelector('.meta')?.textContent || '';
        const movieTitle = (meta.split('•')[1] || '').replace('🌐', '').replace('🔒', '').trim();
        const titleText = wrap.querySelector('.text b')?.textContent || '';
        const descText = wrap.querySelector('.text')?.innerText.replace(titleText, '').trim();
        const imgEl = wrap.querySelector('.preview img');
        const curImage = imgEl ? imgEl.src : '';

        const form = document.createElement('form');
        form.className = 'edit-form';
        form.innerHTML = `
          <input type="text" name="movieTitle" value="${escapeHtml(movieTitle)}" required />
          <input type="text" name="title" value="${escapeHtml(titleText)}" required />
          <textarea name="description" rows="3" required>${escapeHtml(descText)}</textarea>

          <label>Зображення (один із варіантів):</label>
          <input type="url" name="imageUrl" placeholder="Посилання" value="${escapeHtml(curImage)}" />
          <input type="file" name="imageFile" accept="image/*" />
          <div class="preview" id="edit-preview">${curImage ? `<img src="${escapeHtml(curImage)}" alt="preview" />` : ''}</div>

          <label><input type="checkbox" name="isPublic" /> Публічна</label>
          <div class="row gap">
            <button class="btn btn-primary" type="submit">Зберегти</button>
            <button class="btn btn-ghost cancel" type="button">Скасувати</button>
          </div>`;
        wrap.appendChild(form);

        const fileInput = form.querySelector('input[name="imageFile"]');
        const urlInput = form.querySelector('input[name="imageUrl"]');
        const prevEl = form.querySelector('#edit-preview');

        const updatePrev = () => {
          prevEl.innerHTML = '';
          const url = urlInput.value.trim();
          const file = fileInput.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => { prevEl.innerHTML = `<img src="${reader.result}" alt="preview" />`; };
            reader.readAsDataURL(file);
          } else if (url) {
            prevEl.innerHTML = `<img src="${escapeHtml(url)}" alt="preview" />`;
          }
        };
        urlInput.addEventListener('input', updatePrev);
        fileInput.addEventListener('change', updatePrev);

        form.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const f = new FormData(form);
          const patch = {
            movieTitle: (f.get('movieTitle') || '').toString().trim(),
            title: (f.get('title') || '').toString().trim(),
            description: (f.get('description') || '').toString().trim(),
            isPublic: f.get('isPublic') === 'on'
          };
          if (!patch.movieTitle || !patch.title || !patch.description) {
            alert({ text: 'Заповніть усі поля', type: 'notice', delay: 1200 }); return;
          }
          try {
            const file = fileInput.files?.[0];
            let imageUrl = (f.get('imageUrl') || '').toString().trim();
            if (file) {
              const up = await uploadImage(file);
              const base = API_BASE.replace(/\/$/, '');
              imageUrl = `${base}${up.url}`;
            }
            patch.imageUrl = imageUrl || null;

            const updated = await updateCard(id, patch);
            // update UI
            wrap.querySelector('.meta').innerHTML =
              `<b>${escapeHtml(updated.payload.name)}</b> • ${escapeHtml(updated.payload.movieTitle)} • ${new Date(updated.updatedAt).toLocaleString()} ${updated.payload.isPublic ? '• 🌐' : '• 🔒'}`;
            wrap.querySelector('.text').innerHTML =
              `<b>${escapeHtml(updated.payload.title)}</b><br>${escapeHtml(updated.payload.description)}`;
            const prv = wrap.querySelector('.preview');
            if (updated.payload.imageUrl) {
              if (prv) prv.innerHTML = `<img src="${escapeHtml(updated.payload.imageUrl)}" alt="">`;
              else wrap.insertAdjacentHTML('afterbegin', `<div class="preview"><img src="${escapeHtml(updated.payload.imageUrl)}" alt=""></div>`);
            } else {
              prv?.remove();
            }
            form.remove(); alert({ text: 'Збережено!', type: 'success', delay: 900 });
          } catch (err) { alert({ text: `Помилка: ${err.message}`, type: 'error', delay: 1500 }); }
        });

        form.querySelector('.cancel')?.addEventListener('click', () => form.remove());
      }
    });
  } catch (err) {
    alert({ text: `Не вдалося відкрити картки: ${err.message}`, type: 'error', delay: 2000 });
  }
}

// автопошук і “будильник” бекенда
async function wakeServer() { try { await fetch(`${API_BASE}/health`, { cache: 'no-store' }); } catch (_) { } }
window.addEventListener('DOMContentLoaded', () => {
  try { wakeServer(); form.query.value = 'Matrix'; form.dispatchEvent(new Event('submit')); } catch (_) { }
});
