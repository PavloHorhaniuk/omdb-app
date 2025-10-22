(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))o(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const s of r.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&o(s)}).observe(document,{childList:!0,subtree:!0});function t(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(a){if(a.ep)return;a.ep=!0;const r=t(a);fetch(a.href,r)}})();const F={BASE_URL:"/omdb-app/",DEV:!1,MODE:"production",PROD:!0,SSR:!1,VITE_API_BASE:"https://my-json-db-ia9c.onrender.com"},y=F&&"https://my-json-db-ia9c.onrender.com"||window.API_BASE||"";y||console.warn("VITE_API_BASE is empty. Set it in .env or .env.production");function D(e,n){const t=document.createElement("div");t.className=`toast ${e}`,t.textContent=n,document.body.appendChild(t),requestAnimationFrame(()=>t.classList.add("show")),setTimeout(()=>{t.classList.remove("show"),setTimeout(()=>t.remove(),300)},3e3)}const U=e=>D("success",e),L=e=>D("error",e);function M(){let e=localStorage.getItem("omdbUserToken");return e||(e=crypto.randomUUID()+crypto.randomUUID(),localStorage.setItem("omdbUserToken",e)),e}function w(){return{"x-user-token":M()}}async function x(e){try{return await e.json()}catch{return null}}function N(e){e.querySelectorAll(".invalid").forEach(n=>n.classList.remove("invalid"))}function k(e,n=[]){if(N(e),!!Array.isArray(n))for(const t of n){const o=t==null?void 0:t.field;if(!o)continue;const a=e.querySelector(`[name="${o}"]`)||e.querySelector(`[data-field="${o}"]`);a&&a.classList.add("invalid")}}function P(e){return e?e.startsWith("/")?`${y}${e}`:e:null}const A=document.querySelector(".gallery");document.getElementById("add-card-btn")||J();function J(){const e=document.createElement("div");e.className="controls";const n=document.createElement("button");n.id="add-card-btn",n.className="btn btn-primary",n.textContent="Додати картку";const t=document.createElement("button");return t.id="my-cards-btn",t.className="btn",t.textContent="Мої картки",e.append(n,t),document.body.prepend(e),n}const I=document.getElementById("search-form");I&&I.addEventListener("submit",async e=>{e.preventDefault();const n=I.querySelector('[name="query"]').value.trim();await _(n)});async function _(e,n=1){if(e)try{await B();const t=new URL(`${y}/proxy/omdb`);t.searchParams.set("q",e),t.searchParams.set("page",String(n));const o=await fetch(t),a=await o.json();if(!o.ok||a!=null&&a.Error)throw new Error((a==null?void 0:a.error)||(a==null?void 0:a.Error)||`HTTP ${o.status}`);V(a.Search||[]),U("Готово")}catch(t){console.error(t),L(`Помилка запиту: ${t.message||t}`)}}function V(e){if(A){A.innerHTML="";for(const n of e){const t=document.createElement("li");t.className="photo-card";const o=document.createElement("img");o.src=n.Poster&&n.Poster!=="N/A"?n.Poster:"",o.alt=n.Title||"",o.loading="lazy";const a=document.createElement("div");a.className="card-title",a.textContent=`${n.Title||"No title"} ${n.Year?`(${n.Year})`:""}`;const r=document.createElement("div");r.className="card-sub",r.textContent=n.Type||"movie";const s=document.createElement("div");s.className="stats";const i=document.createElement("button");i.className="btn reviews-btn",i.textContent="Відгуки",i.addEventListener("click",()=>Y(n.imdbID,n.Title)),s.append(i),t.append(o,a,r,s),A.append(t)}}}async function Y(e,n){const t=document.createElement("div");t.className="modal",t.innerHTML=`
    <h2>Відгуки: ${b(n)}</h2>
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
  `;const o=q(t),a=t.querySelector("#comments-list"),r=t.querySelector("#comment-form");t.querySelector("#close-modal").onclick=o.close,await s(),r.addEventListener("submit",async i=>{i.preventDefault(),N(r);const m=r.name.value.trim(),u=r.message.value.trim(),l=Number(r.rating.value)||5,p={kind:"comment",imdbID:e,name:m,message:u,rating:l};try{const d=await fetch(`${y}/comments`,{method:"POST",headers:{"Content-Type":"application/json",...w()},body:JSON.stringify(p)}),c=await x(d);if(!d.ok)throw k(r,c==null?void 0:c.errors),new Error((c==null?void 0:c.error)||`HTTP ${d.status}`);r.reset(),await s(),U("Коментар додано")}catch(d){L(`Не вдалося додати: ${d.message||d}`)}});async function s(){const m=await(await fetch(`${y}/comments?imdbID=${encodeURIComponent(e)}`,{headers:w()})).json();a.innerHTML=(m.data||[]).map(u=>`
        <div class="comment">
          <div class="meta">${b(u.payload.name)} • ${new Date(u.createdAt).toLocaleString()} • <span class="rating">★${u.payload.rating}</span></div>
          <div class="text">${b(u.payload.message)}</div>
        </div>`).join("")}}var O;(O=document.getElementById("add-card-btn"))==null||O.addEventListener("click",z);function z(){const e=document.createElement("div");e.className="modal",e.innerHTML=`
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
  `;const n=q(e),t=e.querySelector("#create-card-form"),o=t.querySelector('[name="imageFile"]'),a=t.querySelector(".preview");e.querySelector("#cancel-create").onclick=n.close,o.addEventListener("change",()=>{var s;a.innerHTML="";const r=(s=o.files)==null?void 0:s[0];if(r){const i=document.createElement("img");i.src=URL.createObjectURL(r),a.append(i)}}),t.addEventListener("submit",async r=>{var E;r.preventDefault(),N(t);const s=t.name.value.trim(),i=t.movieTitle.value.trim(),m=t.title.value.trim(),u=t.description.value.trim(),l=t.isPublic.checked,p=t.imageUrl.value.trim(),d=(E=o.files)==null?void 0:E[0];let c=p||null;try{await B(),d&&(c=await R(d),c=P(c));const g={name:s,movieTitle:i,title:m,description:u,isPublic:l};c&&(g.imageUrl=c);const v=await fetch(`${y}/cards`,{method:"POST",headers:{"Content-Type":"application/json",...w()},body:JSON.stringify(g)}),f=await x(v);if(!v.ok)throw k(t,f==null?void 0:f.errors),new Error((f==null?void 0:f.error)||`HTTP ${v.status}`);U("Картку створено"),n.close()}catch(g){L(`Помилка створення: ${g.message||g}`)}})}async function R(e){const n=new FormData;n.append("image",e);const t=await fetch(`${y}/upload`,{method:"POST",body:n}),o=await x(t);if(!t.ok)throw new Error((o==null?void 0:o.error)||`HTTP ${t.status}`);return o.url}var j;(j=document.getElementById("my-cards-btn"))==null||j.addEventListener("click",K);async function K(){const e=document.createElement("div");e.className="modal modal-wide",e.innerHTML=`
    <h2>Мої картки</h2>
    <div id="cards-list" class="list"></div>
    <div class="row gap" style="margin-top:10px;">
      <button class="btn" id="close-modal">Закрити</button>
    </div>
  `;const n=q(e);e.querySelector("#close-modal").onclick=n.close;const t=e.querySelector("#cards-list");await o();async function o(){const m=await(await fetch(`${y}/cards`,{headers:w()})).json();t.innerHTML=(m.data||[]).map(u=>a(u)).join(""),r()}function a(i){const m=i.payload.imageUrl?`<img src="${S(P(i.payload.imageUrl))}" alt="" />`:'<div class="noimg">—</div>';return`
      <div class="card-row" data-id="${i.id}">
        <div class="thumb">${m}</div>
        <div class="info">
          <div class="t">${b(i.payload.title)}</div>
          <div class="sub">${b(i.payload.movieTitle)} • ${b(i.payload.name)} • ${new Date(i.updatedAt).toLocaleString()}</div>
          <div class="desc">${b(i.payload.description)}</div>
        </div>
        <div class="actions">
          <button class="btn edit">Редагувати</button>
          <button class="btn btn-danger remove">Видалити</button>
        </div>
      </div>
    `}function r(){t.querySelectorAll(".remove").forEach(i=>i.addEventListener("click",async m=>{const l=m.target.closest(".card-row").dataset.id;if(!confirm("Видалити картку?"))return;const p=await fetch(`${y}/cards/${l}`,{method:"DELETE",headers:w()}),d=await x(p);if(!p.ok)return L((d==null?void 0:d.error)||`HTTP ${p.status}`);U("Видалено"),await o()})),t.querySelectorAll(".edit").forEach(i=>i.addEventListener("click",async m=>{const l=m.target.closest(".card-row").dataset.id;s(l)}))}async function s(i){const l=((await(await fetch(`${y}/cards`,{headers:w()})).json()).data||[]).find(v=>v.id===i);if(!l)return L("Картку не знайдено");const p=document.createElement("div");p.className="modal",p.innerHTML=`
      <h2>Редагувати картку</h2>
      <form class="comment-form" id="edit-card-form" autocomplete="off">
        <input type="text" name="name" value="${S(l.payload.name)}" placeholder="Ваше ім’я" />
        <input type="text" name="movieTitle" value="${S(l.payload.movieTitle)}" placeholder="Назва фільму" />
        <input type="text" name="title" value="${S(l.payload.title)}" placeholder="Заголовок" />
        <textarea name="description" placeholder="Опис">${b(l.payload.description)}</textarea>

        <div class="muted">Зображення (один із варіантів):</div>
        <input type="url" name="imageUrl" value="${S(P(l.payload.imageUrl)||"")}" placeholder="Посилання на зображення (необов’язково)" />
        <input type="file" name="imageFile" accept="image/*" />
        <div class="preview" data-field="image">
          ${l.payload.imageUrl?`<img src="${S(P(l.payload.imageUrl))}" alt="">`:""}
        </div>

        <label class="row gap" style="margin-top:4px;">
          <input type="checkbox" name="isPublic" ${l.payload.isPublic?"checked":""}/>
          <span>Публічна</span>
        </label>

        <div class="row gap">
          <button type="submit" class="btn btn-primary">Зберегти</button>
          <button type="button" class="btn" id="cancel-edit">Скасувати</button>
        </div>
      </form>
    `;const d=q(p);p.querySelector("#cancel-edit").onclick=d.close;const c=p.querySelector("#edit-card-form"),E=c.querySelector('[name="imageFile"]'),g=c.querySelector(".preview");E.addEventListener("change",()=>{var f;g.innerHTML="";const v=(f=E.files)==null?void 0:f[0];if(v){const h=document.createElement("img");h.src=URL.createObjectURL(v),g.append(h)}}),c.addEventListener("submit",async v=>{var H;v.preventDefault(),N(c);const f={name:c.name.value.trim(),movieTitle:c.movieTitle.value.trim(),title:c.title.value.trim(),description:c.description.value.trim(),isPublic:c.isPublic.checked};let h=c.imageUrl.value.trim()||null;const C=(H=E.files)==null?void 0:H[0];try{C&&(h=await R(C),h=P(h)),h?f.imageUrl=h:f.imageUrl=null;const $=await fetch(`${y}/cards/${i}`,{method:"PATCH",headers:{"Content-Type":"application/json",...w()},body:JSON.stringify(f)}),T=await x($);if(!$.ok)throw k(c,T==null?void 0:T.errors),new Error((T==null?void 0:T.error)||`HTTP ${$.status}`);U("Збережено"),d.close(),await o()}catch($){L(`Помилка збереження: ${$.message||$}`)}})}}function q(e){const n=document.createElement("div");n.className="lb";const t=document.createElement("div");t.className="lb-inner",t.append(e),n.append(t),document.body.append(n);const o=()=>n.remove();return n.addEventListener("click",a=>{a.target===n&&o()}),{close:o}}function b(e=""){return String(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function S(e=""){return b(e).replace(/`/g,"\\`")}async function B(){try{await fetch(`${y}/health`,{cache:"no-store"})}catch{}}(async()=>{M();const e=document.querySelector('#search-form input[name="query"]');e&&e.value.trim()&&_(e.value.trim())})();
