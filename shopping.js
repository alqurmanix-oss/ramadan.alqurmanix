/* =========================================================
   shopping.js — قائمة التسوق المجمّعة (تُحفظ في المتصفح)
   ========================================================= */
(function(){
  const A = (window.AQX = window.AQX || {});
  const KEY = "aqx-shopping-v1";
  let state = { days: {}, items: {} };   // days: {label: true}, items: {key:{n,q,u,a,done}}

  function load(){ try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.items) state = s; } catch(e){} }
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e){} }
  load();

  const listeners = [];
  const emit = () => listeners.forEach(f => f(state));

  // يضيف مكونات مجموعة وصفات (مع معامل ضرب حسب عدد الأفراد)
  function addRecipes(recipes, scaleOf, dayLabel){
    if (dayLabel && state.days[dayLabel]) return false;  // لا نكرر نفس اليوم
    recipes.forEach(r => {
      const f = scaleOf(r);
      r.ingredients.forEach(i => {
        const k = i.n + "|" + i.u;
        if (!state.items[k]) state.items[k] = { n: i.n, q: 0, u: i.u, a: i.a, done: false };
        state.items[k].q += i.q * f;
      });
    });
    if (dayLabel) state.days[dayLabel] = true;
    save(); emit(); return true;
  }
  function toggle(k){ if (state.items[k]) { state.items[k].done = !state.items[k].done; save(); emit(); } }
  function clear(){ state = { days: {}, items: {} }; save(); emit(); }
  const count = () => Object.keys(state.items).length;
  const remaining = () => Object.values(state.items).filter(i => !i.done).length;

  function grouped(){
    const g = {};
    Object.entries(state.items).forEach(([k, i]) => (g[i.a] = g[i.a] || []).push({ k, ...i }));
    Object.values(g).forEach(a => a.sort((x, y) => x.n.localeCompare(y.n, "ar")));
    return g;
  }
  function asText(fmt){
    let t = "🛒 قائمة تسوق AQX\n";
    const days = Object.keys(state.days);
    if (days.length) t += "📅 " + days.join(" ، ") + "\n";
    const g = grouped();
    Object.keys(g).forEach(a => {
      t += `\n*${a}*\n`;
      g[a].forEach(i => { t += `${i.done ? "✅" : "☐"} ${fmt(i.q)} ${i.u} ${i.n}\n`; });
    });
    return t + "\n" + A.config.blogUrl;
  }
  A.shop = { state: () => state, addRecipes, toggle, clear, count, remaining, grouped, asText, onChange: f => listeners.push(f) };
})();
