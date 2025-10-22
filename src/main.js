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

// State
let query = '';
let page = 1;
let totalResults = 0;
let type = '';
let year = '';

// API base (prod береться з .env.production)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

// ------- user token (owner) -------
const USER_TOKEN_KEY = 'omdbUserToken';
const USER_NAME_KEY = 'omdbUserName';

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

// ------- helpers -------
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}
const normalizePoster = (u) => (!u || u === 'N/A') ? '' : u;

// ================= OMDb (через бекенд-проксі) =================
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
      Title: h.Title,
      Year: h.Year,
      imdbID: h.imdbID,
      Type: h.Type,
      poster: normalizePoster(h.Poster),
      posterLarge: normalizePoster(h.Poster)
    }));

    totalResults = parseInt(data.totalResults || '0', 10) || 0;
    return { hits, totalResults };
  } catch (err) {
    alert({ text: `Помилка запиту: ${err.message}`, type: 'error', delay: 2000 });
    return { hits: [], totalResults: 0 };
  }
}

async function fetchById(imdbID) {
  try {
    const url = new URL(`${API_BASE}/proxy/omdb`);
    url.searchParams.set('i', imdbID);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    alert({ text: `Помилка завантаження деталей: ${err.message}`, type: 'error', delay: 2000 });
    throw err;
  }
}

// ================= Comments API =================
async function getComments(imdbID, page = 1) {
  try {
    const url = new URL(`${API_BASE}/comments`);
    url.searchParams.set('imdbID', imdbID);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '50');
    const res = await fetch(url, { headers: { 'x-user-token': USER_TOKEN } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json(); // { data:[{id, own, payload:{name,message,rating,...}}], total,... }
  } catch (err) {
    alert({ text: `Не вдалося отримати коментарі: ${err.message}`, type: 'error', delay: 2000 });
    return { data: [], total: 0 };
  }
}

async function addComment({ imdbID, name, message, rating = 5 }) {
  try {
    const res = await fetch(`${API_BASE}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-token': USER_TOKEN
      },
      body: JSON.stringify({ imdbID, name, message, rating })
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    localStorage.setItem(USER_NAME_KEY, name);
    return await res.json();
  } catch (err) {
    alert({ text: `Не вдалося додати коментар: ${err.message}`, type: 'error', delay: 2000 });
    throw err;
  }
}

async function updateComment(id, patch) {
  try {
    const res = await fetch(`${API_BASE}/comments/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-token': USER_TOKEN
      },
      body: JSON.stringify(patch)
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    alert({ text: `Не вдалося оновити: ${err.message}`, type: 'error', delay: 2000 });
    throw err;
  }
}

async function deleteComment(id) {
  try {
    const res = await fetch(`${API_BASE}/comments/${id}`, {
      method: 'DELETE',
      headers: { 'x-user-token': USER_TOKEN }
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    alert({ text: `Не вдалося видалити: ${err.message}`, type: 'error', delay: 2000 });
    throw err;
  }
}

// ================= UI =================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const fd = new FormData(form);
    const q = (fd.get('query') || '').toString().trim();
    type = (fd.get('type') || '').toString().trim();
    year = (fd.get('year') || '').toString().trim();
    if (!q) return;

    query = q;
    page = 1;
    gallery.innerHTML = '';
    btnMore.hidden = true;

    await fetchAndRender();
  } catch (err) {
    alert({ text: `Помилка форми: ${err.message}`, type: 'error', delay: 2000 });
  }
});

btnMore.addEventListener('click', async () => {
  try {
    page += 1;
    await fetchAndRender(true);
  } catch (err) {
    alert({ text: `Помилка завантаження: ${err.message}`, type: 'error', delay: 2000 });
  }
});

// Клік по картці — деталі (не чіпаємо "Відгуки")
gallery.addEventListener('click', async (e) => {
  const li = e.target.closest('.photo-card');
  if (!li || e.target.closest('.reviews-btn')) return;
  const imdbID = li.dataset.imdb;
  if (!imdbID) return;

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

// Кнопка «Відгуки»
gallery.addEventListener('click', async (e) => {
  const btn = e.target.closest('.reviews-btn');
  if (!btn) return;
  const imdbID = btn.dataset.imdb || btn.closest('.photo-card')?.dataset.imdb;
  if (!imdbID) return;
  await openReviewsModal(imdbID);
});

// Основний рендер пошуку
async function fetchAndRender(append = false) {
  try {
    const { hits, totalResults: tr } = await fetchMovies(query, page, type, year);
    if (!hits.length) {
      if (!append) alert({ text: 'Нічого не знайдено', type: 'notice', delay: 1500 });
      btnMore.hidden = true;
      return;
    }
    const markup = hits.map(cardTpl).join('');
    if (append) {
      gallery.insertAdjacentHTML('beforeend', markup);
      gallery.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else {
      gallery.innerHTML = markup;
    }
    const already = page * 10; // OMDb дає по 10
    btnMore.hidden = already >= tr;
  } catch (err) {
    alert({ text: `Помилка рендера: ${err.message}`, type: 'error', delay: 2000 });
  }
}

// -------- Reviews modal (create/edit/delete, own only) --------
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
           </div>`
        : '';
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
              <option value="5" selected>5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>
          </label>
          <button class="btn btn-primary" type="submit">Надіслати</button>
        </form>
        <div id="comments-list">${listHtml || '<i>Поки що немає коментарів</i>'}</div>
      </div>`;

    const instance = basicLightbox.create(html, { closable: true });
    instance.show();

    const modalEl = document.querySelector('.modal');
    const formEl = modalEl.querySelector('#comment-form');
    const listEl = modalEl.querySelector('#comments-list');

    // CREATE
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(formEl);
      const name = (fd.get('name') || '').toString().trim();
      const message = (fd.get('message') || '').toString().trim();
      const rating = parseInt(fd.get('rating') || '5', 10) || 5;

      if (!name || !message) {
        alert({ text: 'Будь ласка, заповніть ім’я та відгук.', type: 'notice', delay: 1200 });
        return;
      }

      try {
        const created = await addComment({ imdbID, name, message, rating });
        const p = created.payload;
        const stars = '★'.repeat(p.rating || 5);
        const node = document.createElement('div');
        node.className = 'comment';
        node.dataset.id = created.id;
        node.innerHTML = `
          <div class="meta"><b>${escapeHtml(p.name)}</b> • ${new Date(created.createdAt).toLocaleString()} • <span class="rating">${stars}</span></div>
          <div class="text">${escapeHtml(p.message)}</div>
          <div class="comment-actions">
            <button class="btn comment-edit" data-id="${created.id}">Редагувати</button>
            <button class="btn btn-danger comment-delete" data-id="${created.id}">Видалити</button>
          </div>`;
        listEl.insertAdjacentElement('afterbegin', node);
        formEl.reset();
        alert({ text: 'Відгук додано!', type: 'success', delay: 1000 });
      } catch (_) { }
    });

    // EDIT & DELETE
    listEl.addEventListener('click', async (e) => {
      const delBtn = e.target.closest('.comment-delete');
      const editBtn = e.target.closest('.comment-edit');

      // DELETE
      if (delBtn) {
        const id = delBtn.dataset.id;
        try {
          await deleteComment(id);
          delBtn.closest('.comment')?.remove();
        } catch (_) { }
        return;
      }

      // EDIT
      if (editBtn) {
        const id = editBtn.dataset.id;
        const wrapper = editBtn.closest('.comment');
        const meta = wrapper.querySelector('.meta');
        const textEl = wrapper.querySelector('.text');
        const curName = meta.querySelector('b')?.textContent?.trim() || getSavedName();
        const curMsg = textEl.textContent.trim();
        const curStars = (meta.querySelector('.rating')?.textContent || '★★★★★').length;

        if (wrapper.querySelector('.edit-form')) return;
        const editForm = document.createElement('form');
        editForm.className = 'edit-form';
        editForm.innerHTML = `
          <input type="text" name="name" value="${escapeHtml(curName)}" required />
          <textarea name="message" rows="3" required>${escapeHtml(curMsg)}</textarea>
          <select name="rating">
            ${[5, 4, 3, 2, 1].map(v => `<option value="${v}" ${v === curStars ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
          <div class="row gap">
            <button class="btn btn-primary" type="submit">Зберегти</button>
            <button class="btn btn-ghost cancel-edit" type="button">Скасувати</button>
          </div>
        `;
        wrapper.appendChild(editForm);

        editForm.addEventListener('submit', async (ev) => {
          ev.preventDefault();
          const f = new FormData(editForm);
          const name = (f.get('name') || '').toString().trim();
          const message = (f.get('message') || '').toString().trim();
          const rating = parseInt(f.get('rating') || '5', 10) || 5;
          if (!name || !message) {
            alert({ text: 'Ім’я та відгук обов’язкові', type: 'notice', delay: 1200 });
            return;
          }
          try {
            const updated = await updateComment(id, { name, message, rating });
            const p = updated.payload;
            const stars = '★'.repeat(p.rating || 5);
            meta.innerHTML = `<b>${escapeHtml(p.name)}</b> • ${new Date(updated.updatedAt).toLocaleString()} • <span class="rating">${stars}</span>`;
            textEl.textContent = p.message;
            editForm.remove();
            alert({ text: 'Збережено!', type: 'success', delay: 900 });
          } catch (_) { }
        });

        editForm.querySelector('.cancel-edit').addEventListener('click', () => editForm.remove());
      }
    });

  } catch (err) {
    alert({ text: `Не вдалося відкрити відгуки: ${err.message}`, type: 'error', delay: 2000 });
  }
}

// автопошук при завантаженні
window.addEventListener('DOMContentLoaded', () => {
  try {
    form.query.value = 'Matrix';
    form.dispatchEvent(new Event('submit'));
  } catch (_) { }
});
