(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))o(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const c of a.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&o(c)}).observe(document,{childList:!0,subtree:!0});function e(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function o(r){if(r.ep)return;r.ep=!0;const a=e(r);fetch(r.href,a)}})();const ae={BASE_URL:"/omdb-app/",DEV:!1,MODE:"production",PROD:!0,SSR:!1,VITE_API_BASE:"https://my-json-db-ia9c.onrender.com"},p=ae&&"https://my-json-db-ia9c.onrender.com"||window.API_BASE||"";p||console.warn("VITE_API_BASE is empty");function $(t,n){const e=document.createElement("div");e.className=`toast ${t}`,e.textContent=n,document.body.appendChild(e),requestAnimationFrame(()=>e.classList.add("show")),setTimeout(()=>{e.classList.remove("show"),setTimeout(()=>e.remove(),300)},3e3)}const A=t=>$("success",t),E=t=>$("error",t);function Z(){let t=localStorage.getItem("omdbUserToken");return t||(t=crypto.randomUUID()+crypto.randomUUID(),localStorage.setItem("omdbUserToken",t)),t}function k(){return{"x-user-token":Z()}}async function H(t){try{return await t.json()}catch{return null}}function g(t=""){return String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function U(t=""){return g(t).replace(/`/g,"\\`")}function _(t){t.querySelectorAll(".invalid").forEach(n=>n.classList.remove("invalid"))}function z(t,n=[]){if(_(t),!!Array.isArray(n))for(const e of n){const o=e==null?void 0:e.field,r=t.querySelector(`[name="${o}"]`)||t.querySelector(`[data-field="${o}"]`);r&&r.classList.add("invalid")}}function q(t){return t?t.startsWith("/")?`${p}${t}`:t:null}async function G(){try{await fetch(`${p}/health`,{cache:"no-store"})}catch{}}const w=document.querySelector(".gallery"),x=document.getElementById("search-form"),R=document.getElementById("add-card-btn"),F=document.getElementById("my-cards-btn"),B=document.getElementById("public-cards-btn"),T=document.getElementById("load-more");let I="public",J="",V="",Y="",C=1,O=!1,N=1,M=!0;const W=12;Z(),D();B==null||B.addEventListener("click",()=>D());x==null||x.addEventListener("submit",t=>{t.preventDefault();const n=x.querySelector('[name="query"]').value.trim();V=x.querySelector('[name="type"]').value.trim(),Y=x.querySelector('[name="year"]').value.trim(),ne(n,!0)});function D(t){I="public",T.style.display="inline-block",N=1,M=!0,w.innerHTML="",X()}function ne(t,n){I="omdb",J=t,T.style.display="inline-block",C=1,O=!1,w.innerHTML="",ee(J,C,n)}T==null||T.addEventListener("click",async()=>{if(I==="public"){if(!M){$("info","Більше карток немає");return}N+=1,await X()}else{if(!O){$("info","Більше результатів немає");return}C+=1,await ee(J,C,!1)}});function oe(t,n=!0){if(w){n||(w.innerHTML="");for(const e of t){const o=document.createElement("li");o.className="photo-card";const r=document.createElement("img");e.payload.imageUrl?r.src=q(e.payload.imageUrl):r.src="",r.alt=e.payload.title||"",r.loading="lazy";const a=document.createElement("div");a.className="card-title",a.textContent=e.payload.title||"(без назви)";const c=document.createElement("div");c.className="card-sub",c.textContent=`${e.payload.movieTitle||""} • ${e.payload.name||""}`;const i=document.createElement("div");i.className="stats";const s=document.createElement("span");s.className="badge",s.textContent="user",i.append(s),o.append(r,a,c,i),w.append(o)}}}function re(t,n=!0){if(w){n||(w.innerHTML="");for(const e of t){const o=document.createElement("li");o.className="photo-card";const r=document.createElement("img");r.src=e.Poster&&e.Poster!=="N/A"?e.Poster:"",r.alt=e.Title||"",r.loading="lazy";const a=document.createElement("div");a.className="card-title",a.textContent=`${e.Title||"No title"} ${e.Year?`(${e.Year})`:""}`;const c=document.createElement("div");c.className="card-sub",c.textContent=e.Type||"movie";const i=document.createElement("div");i.className="stats";const s=document.createElement("button");s.className="btn reviews-btn",s.textContent="Відгуки",s.addEventListener("click",()=>ie(e.imdbID,e.Title)),i.append(s),o.append(r,a,c,i),w.append(o)}}}async function X(){try{await G();const t=new URL(`${p}/cards`);t.searchParams.set("onlyPublic","true"),t.searchParams.set("page",String(N)),t.searchParams.set("limit",String(W));const n=await fetch(t.toString()),e=await n.json();if(!n.ok)throw new Error((e==null?void 0:e.error)||`HTTP ${n.status}`);oe(e.data||[],!0),M=N*W<(e.total||0),T.style.display=M?"inline-block":"none",N===1&&(!e.data||e.data.length===0)&&$("info","Поки що публічних карток немає")}catch(t){console.error(t),E(`Помилка завантаження публічних карток: ${t.message||t}`)}}async function ee(t,n=1,e=!1){if(!t){$("info","Введи запит у полі пошуку");return}try{await G();const o=new URL(`${p}/proxy/omdb`);o.searchParams.set("q",t),o.searchParams.set("page",String(n)),V&&o.searchParams.set("type",V),Y&&o.searchParams.set("y",Y);const r=await fetch(o.toString()),a=await r.json();if(!r.ok||a!=null&&a.Error)throw new Error((a==null?void 0:a.error)||(a==null?void 0:a.Error)||`HTTP ${r.status}`);const c=a.Search||[];re(c,!e);const i=Number(a.totalResults||0);O=n*c.length<i,T.style.display=O?"inline-block":"none",e&&c.length===0&&$("info","Нічого не знайдено")}catch(o){console.error(o),E(`Помилка запиту: ${o.message||o}`)}}async function ie(t,n){const e=document.createElement("div");e.className="modal",e.innerHTML=`
    <h2>Відгуки: ${g(n)}</h2>
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
  `;const o=j(e),r=e.querySelector("#comments-list"),a=e.querySelector("#comment-form");e.querySelector("#close-modal").onclick=o.close,await c(),a.addEventListener("submit",async i=>{i.preventDefault(),_(a);const s={kind:"comment",imdbID:t,name:a.name.value.trim(),message:a.message.value.trim(),rating:Number(a.rating.value)||5};try{const d=await fetch(`${p}/comments`,{method:"POST",headers:{"Content-Type":"application/json",...k()},body:JSON.stringify(s)}),l=await H(d);if(!d.ok)throw z(a,l==null?void 0:l.errors),new Error((l==null?void 0:l.error)||`HTTP ${d.status}`);a.reset(),await c(),A("Коментар додано")}catch(d){E(`Не вдалося додати: ${d.message||d}`)}});async function c(){const s=await(await fetch(`${p}/comments?imdbID=${encodeURIComponent(t)}`)).json();r.innerHTML=(s.data||[]).map(d=>`
      <div class="comment">
        <div class="meta">${g(d.payload.name)} • ${new Date(d.createdAt).toLocaleString()} • <span class="rating">★${d.payload.rating}</span></div>
        <div class="text">${g(d.payload.message)}</div>
      </div>
    `).join("")}}R==null||R.addEventListener("click",ce);F==null||F.addEventListener("click",se);function ce(){const t=document.createElement("div");t.className="modal",t.innerHTML=`
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
  `;const n=j(t),e=t.querySelector("#create-card-form"),o=e.querySelector('[name="imageFile"]'),r=e.querySelector(".preview");t.querySelector("#cancel-create").onclick=n.close,o.addEventListener("change",()=>{var c;r.innerHTML="";const a=(c=o.files)==null?void 0:c[0];if(a){const i=document.createElement("img");i.src=URL.createObjectURL(a),r.append(i)}}),e.addEventListener("submit",async a=>{var S;a.preventDefault(),_(e);const c=e.name.value.trim(),i=e.movieTitle.value.trim(),s=e.title.value.trim(),d=e.description.value.trim(),l=e.isPublic.checked,f=e.imageUrl.value.trim(),v=(S=o.files)==null?void 0:S[0];let m=f||null;try{await G(),v&&(m=await te(v),m=q(m));const b={name:c,movieTitle:i,title:s,description:d,isPublic:l};m&&(b.imageUrl=m);const y=await fetch(`${p}/cards`,{method:"POST",headers:{"Content-Type":"application/json",...k()},body:JSON.stringify(b)}),u=await H(y);if(!y.ok)throw z(e,u==null?void 0:u.errors),new Error((u==null?void 0:u.error)||`HTTP ${y.status}`);A("Картку створено"),n.close(),I==="public"&&l&&D(!0)}catch(b){E(`Помилка створення: ${b.message||b}`)}})}async function te(t){const n=new FormData;n.append("image",t);const e=await fetch(`${p}/upload`,{method:"POST",body:n}),o=await H(e);if(!e.ok)throw new Error((o==null?void 0:o.error)||`HTTP ${e.status}`);return o.url}async function se(){const t=document.createElement("div");t.className="modal modal-wide",t.innerHTML=`
    <h2>Мої картки</h2>
    <div id="cards-list" class="list"></div>
    <div class="row gap" style="margin-top:10px;">
      <button class="btn" id="close-modal">Закрити</button>
    </div>
  `;const n=j(t);t.querySelector("#close-modal").onclick=n.close;const e=t.querySelector("#cards-list");await o();async function o(){const s=await(await fetch(`${p}/cards`,{headers:k()})).json();e.innerHTML=(s.data||[]).map(r).join(""),a()}function r(i){const s=i.payload.imageUrl?`<img src="${U(q(i.payload.imageUrl))}" alt="" />`:'<div class="noimg">—</div>';return`
      <div class="card-row" data-id="${i.id}">
        <div class="thumb">${s}</div>
        <div class="info">
          <div class="t">${g(i.payload.title)}</div>
          <div class="sub">${g(i.payload.movieTitle)} • ${g(i.payload.name)} • ${new Date(i.updatedAt).toLocaleString()}</div>
          <div class="desc">${g(i.payload.description)}</div>
        </div>
        <div class="actions">
          <button class="btn edit">Редагувати</button>
          <button class="btn btn-danger remove">Видалити</button>
        </div>
      </div>
    `}function a(){e.querySelectorAll(".remove").forEach(i=>i.addEventListener("click",async s=>{const l=s.target.closest(".card-row").dataset.id;if(!confirm("Видалити картку?"))return;const f=await fetch(`${p}/cards/${l}`,{method:"DELETE",headers:k()}),v=await H(f);if(!f.ok)return E((v==null?void 0:v.error)||`HTTP ${f.status}`);A("Видалено"),await o()})),e.querySelectorAll(".edit").forEach(i=>i.addEventListener("click",async s=>{const d=s.target.closest(".card-row");c(d.dataset.id)}))}async function c(i){const l=((await(await fetch(`${p}/cards`,{headers:k()})).json()).data||[]).find(y=>y.id===i);if(!l)return E("Картку не знайдено");const f=document.createElement("div");f.className="modal",f.innerHTML=`
      <h2>Редагувати картку</h2>
      <form class="comment-form" id="edit-card-form" autocomplete="off">
        <input type="text" name="name" value="${U(l.payload.name)}" placeholder="Ваше ім’я" />
        <input type="text" name="movieTitle" value="${U(l.payload.movieTitle)}" placeholder="Назва фільму" />
        <input type="text" name="title" value="${U(l.payload.title)}" placeholder="Заголовок" />
        <textarea name="description" placeholder="Опис">${g(l.payload.description)}</textarea>

        <div class="muted">Зображення (один із варіантів):</div>
        <input type="url" name="imageUrl" value="${U(q(l.payload.imageUrl)||"")}" placeholder="Посилання на зображення (необов’язково)" />
        <input type="file" name="imageFile" accept="image/*" />
        <div class="preview" data-field="image">
          ${l.payload.imageUrl?`<img src="${U(q(l.payload.imageUrl))}" alt="">`:""}
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
    `;const v=j(f);f.querySelector("#cancel-edit").onclick=v.close;const m=f.querySelector("#edit-card-form"),S=m.querySelector('[name="imageFile"]'),b=m.querySelector(".preview");S.addEventListener("change",()=>{var u;b.innerHTML="";const y=(u=S.files)==null?void 0:u[0];if(y){const h=document.createElement("img");h.src=URL.createObjectURL(y),b.append(h)}}),m.addEventListener("submit",async y=>{var Q;y.preventDefault(),_(m);const u={name:m.name.value.trim(),movieTitle:m.movieTitle.value.trim(),title:m.title.value.trim(),description:m.description.value.trim(),isPublic:m.isPublic.checked};let h=m.imageUrl.value.trim()||null;const K=(Q=S.files)==null?void 0:Q[0];try{K&&(h=await te(K),h=q(h)),h?u.imageUrl=h:u.imageUrl=null;const L=await fetch(`${p}/cards/${i}`,{method:"PATCH",headers:{"Content-Type":"application/json",...k()},body:JSON.stringify(u)}),P=await H(L);if(!L.ok)throw z(m,P==null?void 0:P.errors),new Error((P==null?void 0:P.error)||`HTTP ${L.status}`);A("Збережено"),v.close(),await o(),I==="public"&&D(!0)}catch(L){E(`Помилка збереження: ${L.message||L}`)}})}}function j(t){const n=document.createElement("div");n.className="lb";const e=document.createElement("div");e.className="lb-inner",e.append(t),n.append(e),document.body.append(n);const o=()=>n.remove();return n.addEventListener("click",r=>{r.target===n&&o()}),{close:o}}
