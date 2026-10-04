/* =========================================================
   app.js — المنطق الرئيسي: اليوم الحالي، الشهور، السفرة، التسوق
   ========================================================= */
(function(){
  const A = window.AQX, C = A.config, U = A.ui;
  const $ = s => document.querySelector(s);
  const store = { recipes: {}, cats: {}, menus: null, months: null };
  const st = { mode: "ramadan", day: 1, view: "recipe", servings: C.defaultServings };
  const MONTH_NAMES = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

  /* ---------- التاريخ ---------- */
  function hijriToday(){
    try {
      const d = new Date(Date.now() + (C.hijriOffset || 0) * 864e5);
      const p = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric" }).formatToParts(d);
      const g = t => +p.find(x => x.type === t).value;
      return { d: g("day"), m: g("month"), y: g("year") };
    } catch (e) { return null; }
  }
  function dayOfYear(m, d){
    const y = new Date().getFullYear();
    return Math.round((new Date(y, m - 1, d) - new Date(y, 0, 0)) / 864e5);
  }
  const monthDays = m => new Date(new Date().getFullYear(), m, 0).getDate();
  const isRamadan = () => st.mode === "ramadan";
  const monthInfo = () => isRamadan() ? store.months.ramadan : store.months.gregorian[st.mode - 1];
  const dayLabel = () => isRamadan() ? `${U.nAr(st.day)} رمضان` : `${U.nAr(st.day)} ${MONTH_NAMES[st.mode - 1]}`;

  /* ---------- بناء سفرة اليوم ---------- */
  function buildMenu(){
    const ids = {}; let title = "";
    const rot = store.menus.rotation;
    if (isRamadan()) {
      const row = store.menus.ramadan[st.day - 1];
      Object.assign(ids, row); title = row.title || "";
    } else {
      const key = String(st.mode).padStart(2, "0") + "-" + String(st.day).padStart(2, "0");
      const base = dayOfYear(st.mode, st.day) - 1;
      Object.keys(rot).forEach(k => ids[k] = rot[k][(base + (k === "drink" ? 1 : 0)) % rot[k].length]);
      const ov = store.menus.overrides[key]; if (ov) { Object.assign(ids, ov); title = ov.title || ""; }
    }
    const menu = { title };
    Object.keys(rot).forEach(k => { if (ids[k]) menu[k] = store.recipes[ids[k]]; });
    return menu;
  }

  /* ---------- الثيم ---------- */
  function applyTheme(){
    const m = monthInfo();
    const r = document.documentElement.style;
    r.setProperty("--m1", m.c1); r.setProperty("--m2", m.c2);
    document.querySelector('meta[name="theme-color"]').content = m.c1;
    U.lanterns($("#lanterns"), isRamadan());
    $("#heroEyebrow").textContent = isRamadan() ? "رمضان كريم 🌙" : `﷽ ${m.emoji}`;
    $("#heroSub").textContent = isRamadan()
      ? "ثلاثون يومًا، ثلاثون سفرة — شوربة وطبق رئيسي وسلطة ومقبلات ومشروب وحلو"
      : `سفرة متكاملة لكل يوم من ${m.name} — مع خطة تحضير وقائمة تسوق`;
    $("#heroDate").textContent = `📅 ${dayLabel()}`;
  }

  /* ---------- الرسم ---------- */
  function renderTabs(){
    const chips = [`<button class="m-chip ${isRamadan() ? "active" : ""}" data-m="ramadan">🌙 رمضان</button>`]
      .concat(store.months.gregorian.map(m => `<button class="m-chip ${st.mode === m.id ? "active" : ""}" data-m="${m.id}">${m.emoji} ${m.name}</button>`));
    $("#monthTabs").innerHTML = chips.join("");
    const n = isRamadan() ? 30 : monthDays(st.mode);
    const t = todayState();
    $("#dayGrid").innerHTML = Array.from({ length: n }, (_, i) => i + 1).map(d =>
      `<button class="d-btn ${d === st.day ? "active" : ""} ${t.mode === st.mode && t.day === d ? "today" : ""}" data-d="${d}">${U.nAr(d)}</button>`).join("");
  }
  function render(){
    applyTheme(); renderTabs();
    const menu = buildMenu(); const ctx = { dayLabel: dayLabel(), servings: st.servings };
    $("#viewRecipe").innerHTML = U.recipeCard(menu.main, ctx);
    $("#viewSofra").innerHTML = U.sofraView(menu, ctx);
    document.querySelectorAll(".vs-btn").forEach(b => b.classList.toggle("active", b.dataset.view === st.view));
    $("#viewRecipe").hidden = st.view !== "recipe"; $("#viewSofra").hidden = st.view !== "sofra";
    observe(); matchBlogger(menu);
    try { history.replaceState(null, "", `#${isRamadan() ? "r" : "m" + st.mode}-${st.day}`); } catch (e) {}
  }
  function observe(){
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .08 });
    document.querySelectorAll(".reveal:not(.in)").forEach(el => io.observe(el));
  }

  /* ---------- ربط الوصفات بمنشورات بلوجر (صورة + رابط) ---------- */
  function matchBlogger(menu){
    if (!C.autoMatchBlogger) return;
    Object.values(menu).forEach(r => {
      if (!r || !r.id) return;
      A.blogger.matchRecipe(r).then(p => {
        if (!p) return;
        document.querySelectorAll(`[data-full="${r.id}"]`).forEach(a => a.href = p.link);
        document.querySelectorAll(`[data-rid="${r.id}"]`).forEach(el => {
          if (el.querySelector("img") || !p.thumb) return;
          const img = new Image(); img.alt = r.title; img.loading = "lazy";
          img.onload = () => el.prepend(img);
          img.src = p.thumb;
        });
        document.querySelectorAll(`[data-open="${r.id}"]`).forEach(el => el.dataset.link = p.link);
      });
    });
  }

  /* ---------- أقسام بلوجر ---------- */
  async function loadSection(label){
    document.querySelectorAll("#sectionTabs .m-chip").forEach(b => b.classList.toggle("active", b.dataset.l === label));
    $("#sectionMore").href = A.blogger.labelUrl(label);
    $("#postGrid").innerHTML = U.skeletons(3);
    try {
      const list = await A.blogger.byLabel(label, C.postsPerSection);
      $("#postGrid").innerHTML = U.postCards(list); observe();
    } catch (e) {
      $("#postGrid").innerHTML = `<p class="empty">تعذّر تحميل القسم الآن. <a class="btn-link" href="${A.blogger.labelUrl(label)}" target="_blank" rel="noopener">افتحه في المدونة</a></p>`;
    }
  }
  function initSections(){
    $("#sectionTabs").innerHTML = C.sectionTabs.map(l => `<button class="m-chip" data-l="${U.esc(l)}">${U.esc(l)}</button>`).join("");
    $("#sectionTabs").addEventListener("click", e => { const b = e.target.closest("[data-l]"); if (b) loadSection(b.dataset.l); });
    const lazy = new IntersectionObserver(es => { if (es[0].isIntersecting) { lazy.disconnect(); loadSection(C.sectionTabs[0]); } }, { rootMargin: "300px" });
    lazy.observe($("#sections"));
  }

  /* ---------- التسوق ---------- */
  function toast(msg){ const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); }
  function scaleOf(){ return r => st.servings / r.servings; }
  function addToCart(kind){
    const menu = buildMenu();
    const recipes = kind === "menu" ? Object.keys(store.menus.rotation).map(k => menu[k]).filter(Boolean) : [menu.main];
    const label = dayLabel() + (kind === "menu" ? " (سفرة)" : " (وصفة)");
    const ok = A.shop.addRecipes(recipes, scaleOf(), label);
    toast(ok ? "🛒 تمت الإضافة إلى قائمة التسوق" : "هذا اليوم مضاف بالفعل في القائمة");
    if (ok) openDrawer();
  }
  function renderCart(){
    const g = A.shop.grouped(); const s = A.shop.state();
    $("#cartCount").textContent = U.nAr(A.shop.remaining());
    $("#cartDays").innerHTML = Object.keys(s.days).map(d => `<span class="d-tag">${U.esc(d)}</span>`).join("");
    const keys = Object.keys(g);
    $("#cartBody").innerHTML = keys.length ? keys.map(a => `<div class="aisle"><h5>${U.esc(a)}</h5>${g[a].map(i =>
      `<label class="item ${i.done ? "done" : ""}"><input type="checkbox" data-k="${U.esc(i.k)}" ${i.done ? "checked" : ""}><span>${U.esc(i.n)}</span><b>${A.fmtQty(i.q)} ${U.esc(i.u)}</b></label>`).join("")}</div>`).join("")
      : `<p class="empty">القائمة فارغة.<br>اضغط «أضف مكونات سفرة اليوم» لتبدأ 🛒</p>`;
  }
  const openDrawer = () => { $("#drawer").classList.add("open"); $("#scrim").hidden = false; $("#drawer").setAttribute("aria-hidden", "false"); };
  const closeDrawer = () => { $("#drawer").classList.remove("open"); $("#scrim").hidden = true; $("#drawer").setAttribute("aria-hidden", "true"); };

  /* ---------- الأحداث ---------- */
  function bind(){
    document.addEventListener("click", e => {
      const t = e.target;
      let el;
      if ((el = t.closest("[data-m]"))) { st.mode = el.dataset.m === "ramadan" ? "ramadan" : +el.dataset.m; st.day = 1; if (st.mode !== "ramadan" && sameMonthNow()) st.day = new Date().getDate(); render(); return; }
      if ((el = t.closest("[data-d]"))) { st.day = +el.dataset.d; render(); scrollTo("#today"); return; }
      if ((el = t.closest(".vs-btn"))) { st.view = el.dataset.view; render(); return; }
      if ((el = t.closest("[data-view-go]"))) { st.view = el.dataset.viewGo; render(); scrollTo("#today"); return; }
      if ((el = t.closest("[data-serv]"))) { st.servings = +el.dataset.serv; render(); return; }
      if ((el = t.closest("[data-add]"))) { addToCart(el.dataset.add); return; }
      if ((el = t.closest("[data-open]"))) { const l = el.dataset.link; if (l) window.open(l, "_blank", "noopener"); else { st.view = "recipe"; const r = store.recipes[el.dataset.open]; openRecipe(r); } return; }
    });
    $("#cartOpen").onclick = openDrawer; $("#cartClose").onclick = closeDrawer; $("#scrim").onclick = closeDrawer;
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });
    $("#cartBody").addEventListener("change", e => { if (e.target.dataset.k) A.shop.toggle(e.target.dataset.k); });
    $("#cartClear").onclick = () => { if (confirm("تفريغ قائمة التسوق؟")) A.shop.clear(); };
    $("#cartPrint").onclick = () => window.print();
    $("#cartCopy").onclick = async () => { try { await navigator.clipboard.writeText(A.shop.asText(A.fmtQty)); toast("تم نسخ القائمة ✅"); } catch (e) { toast("تعذّر النسخ"); } };
    $("#cartShare").onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent(A.shop.asText(A.fmtQty)), "_blank", "noopener");
    A.shop.onChange(renderCart);
  }
  // فتح وصفة معيّنة من السفرة كوصفة اليوم المعروضة (بدون تغيير القائمة)
  function openRecipe(r){
    const ctx = { dayLabel: dayLabel(), servings: st.servings };
    $("#viewRecipe").innerHTML = U.recipeCard(r, ctx);
    document.querySelectorAll(".vs-btn").forEach(b => b.classList.toggle("active", b.dataset.view === "recipe"));
    $("#viewRecipe").hidden = false; $("#viewSofra").hidden = true; st.view = "recipe";
    observe(); matchBlogger({ r }); scrollTo("#today");
  }
  const scrollTo = s => document.querySelector(s).scrollIntoView({ behavior: "smooth", block: "start" });
  const sameMonthNow = () => st.mode === new Date().getMonth() + 1;

  function todayState(){
    const h = hijriToday();
    if (h && h.m === 9) return { mode: "ramadan", day: Math.min(h.d, 30) };
    const n = new Date(); return { mode: n.getMonth() + 1, day: n.getDate() };
  }
  function fromHash(){
    const m = location.hash.match(/^#(r|m(\d+))-(\d+)$/);
    if (!m) return null;
    return { mode: m[1] === "r" ? "ramadan" : +m[2], day: +m[3] };
  }

  /* ---------- تشغيل ---------- */
  async function init(){
    try {
      const [r, m, mo] = await Promise.all(["recipes", "menus", "months"].map(k => fetch(C.data[k]).then(x => x.json())));
      r.recipes.forEach(x => store.recipes[x.id] = x); store.cats = r.categories; store.menus = m; store.months = mo;
    } catch (e) {
      $("#viewRecipe").innerHTML = `<p class="empty">تعذّر تحميل ملفات البيانات. شغّل الموقع عبر GitHub Pages أو خادم محلي.</p>`; return;
    }
    Object.assign(st, fromHash() || todayState());
    U.stars($(".stars")); bind(); renderCart(); render(); initSections();
  }
  init();
})();
