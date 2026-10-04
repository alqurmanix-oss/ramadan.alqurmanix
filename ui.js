/* =========================================================
   ui.js — دوال العرض (HTML) للوصفة والسفرة والخطة والمنشورات
   ========================================================= */
(function(){
  const A = (window.AQX = window.AQX || {});
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const nAr = n => Number(n).toLocaleString("ar-EG");

  function fmtQty(q){
    q = Math.round(q * 4) / 4;
    if (q <= 0) return "";
    const w = Math.floor(q), f = q - w;
    const fr = { 0.25: "¼", 0.5: "½", 0.75: "¾" }[f] || "";
    if (!w) return fr;
    return nAr(w) + (fr ? " و" + fr : "");
  }
  A.fmtQty = fmtQty;

  const COURSES = [
    ["soup", "🥣", "الشوربة"], ["main", "🍽️", "الطبق الرئيسي"], ["salad", "🥗", "السلطة"],
    ["appetizer", "🥟", "المقبلات"], ["drink", "🥤", "المشروب"], ["dessert", "🍰", "الحلو"]
  ];
  const PLAN_VERB = {
    soup: r => `ابدأ بـ ${r.title}`, main: r => `جهّز الطبق الرئيسي: ${r.title}`, salad: r => `حضّر ${r.title}`,
    appetizer: r => `جهّز المقبلات: ${r.title}`, drink: r => `جهّز المشروب: ${r.title}`, dessert: r => `واختم بالحلو: ${r.title}`
  };
  A.COURSES = COURSES;

  const diffIcon = d => d === "سهلة" ? "⭐" : d === "متوسطة" ? "⭐⭐" : "⭐⭐⭐";

  function plate(r, cls){
    return `<div class="${cls}" data-rid="${esc(r.id)}">${r.image ? `<img src="${esc(r.image)}" alt="${esc(r.title)}" loading="lazy">` : ""}<span class="emoji">${r.emoji}</span></div>`;
  }

  function recipeCard(r, ctx){
    const f = ctx.servings / r.servings;
    const total = r.prepTime + r.cookTime;
    return `
    <article class="frame reveal"><div class="frame-in">
      <header class="rc-head">
        <span class="rc-badge">🍽️ وصفة اليوم</span>
        <h3 class="rc-title">${esc(r.title)}</h3>
        <p class="rc-sub">وصفة مختارة ليوم ${esc(ctx.dayLabel)}</p>
        <div class="chips">
          <span class="chip">⏱️ ${nAr(total)} دقيقة</span>
          <span class="chip">👨‍👩‍👧‍👦 تكفي ${nAr(ctx.servings)} أفراد</span>
          <span class="chip">${diffIcon(r.difficulty)} ${esc(r.difficulty)} التحضير</span>
        </div>
      </header>
      <div class="rc-body">
        <div>
          <div class="plate-wrap">${plate(r, "plate")}</div>
          <p class="intro">${esc(r.description)}</p>
          <div class="meta-grid">
            <div class="meta"><i>🔪</i><small>وقت التحضير</small><b>${nAr(r.prepTime)} د</b></div>
            <div class="meta"><i>🔥</i><small>وقت الطهي</small><b>${nAr(r.cookTime)} د</b></div>
            <div class="meta"><i>📊</i><small>مستوى الصعوبة</small><b>${esc(r.difficulty)}</b></div>
            <div class="meta"><i>👥</i><small>عدد الأشخاص</small><b>${nAr(ctx.servings)}</b></div>
            <div class="meta"><i>💰</i><small>السعر التقريبي</small><b>${nAr(Math.round(r.cost * f / 5) * 5)} ${A.config.currency}</b></div>
            <div class="meta"><i>🍴</i><small>نوع الوجبة</small><b>${esc(r.meal)}</b></div>
          </div>
        </div>
        <div>
          <h4 class="col-title">🧺 المكونات</h4>
          <div class="servings"><span>عدد الأفراد:</span>${A.config.servingsOptions.map(n => `<button data-serv="${n}" class="${n === ctx.servings ? "m-chip active" : "m-chip"}">${nAr(n)}</button>`).join("")}</div>
          <ul class="ing-list">${r.ingredients.map(i => `<li><span>${esc(i.n)}</span><b>${fmtQty(i.q * f)} ${esc(i.u)}</b></li>`).join("")}</ul>
          <h4 class="col-title">👩‍🍳 طريقة التحضير</h4>
          <ol class="steps">${r.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
          <div class="actions">
            <a class="btn-gold" data-full="${esc(r.id)}" href="${A.blogger.searchUrl(r.title)}" target="_blank" rel="noopener">شاهد الوصفة كاملة ↗</a>
            <button class="btn-green" data-add="recipe">🛒 أضف مكونات الوصفة</button>
            <button class="btn-ghost" data-view-go="sofra">🍲 شاهد سفرة اليوم</button>
          </div>
        </div>
      </div>
    </div></article>`;
  }

  function planOf(menu){
    const items = COURSES.map(([k]) => ({ k, r: menu[k] })).filter(x => x.r);
    const sumPrep = items.reduce((s, x) => s + x.r.prepTime, 0);
    const maxCook = Math.max(...items.map(x => x.r.cookTime));
    return { items, total: sumPrep + maxCook };
  }

  function sofraView(menu, ctx){
    const main = menu.main;
    const plan = planOf(menu);
    const card = (k, ico, label, feat) => {
      const r = menu[k]; if (!r) return "";
      return `<div class="course reveal ${feat ? "featured" : ""}" data-open="${esc(r.id)}">
        <span class="course-tag">${ico} ${label}</span>
        ${plate(r, "course-img")}
        <div><h4>${esc(r.title)}</h4><p>${esc(r.description)}</p>
        <div class="cm"><span>⏱️ ${nAr(r.prepTime + r.cookTime)} د</span><span>${diffIcon(r.difficulty)}</span></div></div>
      </div>`;
    };
    return `
    <div class="sofra-head reveal">
      <h3>🍲 ${esc(menu.title || "سفرة اليوم")}</h3>
      <p>سفرة متكاملة ليوم ${esc(ctx.dayLabel)} — من الشوربة إلى الحلو</p>
    </div>
    <div class="course-grid">
      ${card("main", "🍽️", "الطبق الرئيسي", true)}
      ${COURSES.filter(c => c[0] !== "main").map(c => card(c[0], c[1], c[2])).join("")}
    </div>
    ${menu.suhoor ? `<div class="course-grid suhoor">${card("suhoor", "🌙", "اقتراح السحور", false)}</div>` : ""}

    <section class="plan reveal">
      <h3>⏱️ خطة التحضير</h3>
      <p>الوقت المتوقع للتحضير حوالي <b>${nAr(plan.total)}</b> دقيقة — ابدأ قبل الأذان بـ <b>${nAr(Math.ceil((plan.total + 10) / 5) * 5)}</b> دقيقة تقريبًا</p>
      <ol class="timeline">
        ${plan.items.map((x, i) => `<li><span class="dot">${COURSES.find(c => c[0] === x.k)[1]}</span><b>${nAr(i + 1)}. ${esc(PLAN_VERB[x.k](x.r))}</b><span>حوالي ${nAr(x.r.prepTime)} دقيقة تحضير${x.r.cookTime ? " + " + nAr(x.r.cookTime) + " دقيقة طهي" : ""}</span></li>`).join("")}
      </ol>
      <div class="actions">
        <button class="btn-gold" data-add="menu">🛒 أضف مكونات سفرة اليوم إلى قائمة التسوق</button>
        <button class="btn-ghost" style="background:rgba(255,255,255,.9)" data-view-go="recipe">🍽️ وصفة اليوم</button>
      </div>
    </section>`;
  }

  function postCards(list){
    if (!list.length) return `<p class="empty">لا توجد منشورات في هذا القسم حاليًا.</p>`;
    return list.map(p => `<a class="post reveal" href="${esc(p.link)}" target="_blank" rel="noopener">
      <div class="pimg">${p.thumb ? `<img src="${esc(p.thumb)}" alt="" loading="lazy">` : "🍽️"}</div>
      <h4>${esc(p.title)}</h4><p>${esc(p.summary)}</p></a>`).join("");
  }
  const skeletons = n => Array.from({ length: n }, () => `<div class="skeleton"></div>`).join("");

  // الفوانيس
  function lanterns(el, on){
    el.innerHTML = "";
    if (!on) return;
    const spots = [[3, 120, .8], [11, 190, 1], [19, 100, .65], [81, 100, .65], [89, 190, 1], [97, 120, .8]];
    spots.forEach(([x, len, sc], i) => {
      const d = document.createElement("div");
      d.className = "lantern";
      d.style.cssText = `right:${x}%;animation-delay:${-i * .8}s;transform:scale(${sc})`;
      d.innerHTML = `<svg width="78" height="${len + 110}" viewBox="0 0 78 ${len + 110}">
        <line x1="39" y1="0" x2="39" y2="${len}" stroke="#e8c76a" stroke-width="2"/>
        <g transform="translate(0,${len})">
          <path d="M39 0c6 0 9 4 9 8H30c0-4 3-8 9-8z" fill="#c9a24a"/>
          <path d="M22 12h34l4 8H18z" fill="#e5c26a"/>
          <path d="M20 20h38c6 18 6 40 0 60H20c-6-20-6-42 0-60z" fill="#ffd979" fill-opacity=".92" stroke="#b98a31" stroke-width="3"/>
          <path d="M39 20v60M29 20c-4 20-4 40 0 60M49 20c4 20 4 40 0 60" stroke="#b98a31" stroke-width="2" fill="none"/>
          <circle cx="39" cy="50" r="12" fill="#fff6cf" opacity=".8"/>
          <path d="M18 80h42l-4 10H22z" fill="#e5c26a"/>
          <path d="M33 90h12l-6 16z" fill="#c9a24a"/>
        </g></svg>`;
      el.appendChild(d);
    });
  }
  function stars(el){
    if (el.childElementCount) return;
    for (let i = 0; i < 46; i++) {
      const s = document.createElement("i");
      s.style.cssText = `top:${Math.random() * 90}%;right:${Math.random() * 100}%;animation-delay:${Math.random() * 3}s;transform:scale(${.6 + Math.random()})`;
      el.appendChild(s);
    }
  }

  A.ui = { esc, nAr, recipeCard, sofraView, postCards, skeletons, lanterns, stars, planOf };
})();
