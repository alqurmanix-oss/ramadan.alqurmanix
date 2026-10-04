/* =========================================================
   blogger.js — سحب المنشورات من بلوجر (Feeds JSON) حسب القسم/العنوان
   يعمل بـ fetch ثم JSONP تلقائيًا لو CORS مقفول
   ========================================================= */
(function(){
  const A = (window.AQX = window.AQX || {});
  const cache = new Map();

  function jsonp(url){
    return new Promise((res, rej) => {
      const cb = "aqxcb" + Math.random().toString(36).slice(2);
      const s = document.createElement("script");
      const t = setTimeout(() => { cleanup(); rej(new Error("timeout")); }, 9000);
      function cleanup(){ clearTimeout(t); delete window[cb]; s.remove(); }
      window[cb] = d => { cleanup(); res(d); };
      s.onerror = () => { cleanup(); rej(new Error("jsonp")); };
      s.src = url + "&alt=json-in-script&callback=" + cb;
      document.head.appendChild(s);
    });
  }
  async function getJSON(url){
    if (cache.has(url)) return cache.get(url);
    let data;
    try {
      const r = await fetch(url + "&alt=json");
      if (!r.ok) throw new Error(r.status);
      data = await r.json();
    } catch (e) { data = await jsonp(url); }
    cache.set(url, data);
    return data;
  }

  function bigThumb(u){ return u ? u.replace(/\/s\d+(-c)?\//, "/s640/").replace(/=s\d+(-c)?/, "=s640") : ""; }
  function normalize(e){
    const link = (e.link || []).find(l => l.rel === "alternate");
    let thumb = e.media$thumbnail ? e.media$thumbnail.url : "";
    if (!thumb) {
      const html = (e.content && e.content.$t) || (e.summary && e.summary.$t) || "";
      const m = html.match(/<img[^>]+src=["']([^"']+)/i);
      thumb = m ? m[1] : "";
    }
    const raw = (e.summary && e.summary.$t) || "";
    const text = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return {
      title: e.title.$t,
      link: link ? link.href : A.config.blogUrl,
      thumb: bigThumb(thumb),
      summary: text.slice(0, 110) + (text.length > 110 ? "…" : "")
    };
  }
  const base = () => A.config.blogUrl.replace(/\/$/, "");

  async function byLabel(label, n){
    const url = `${base()}/feeds/posts/summary/-/${encodeURIComponent(label)}?max-results=${n || 6}`;
    const d = await getJSON(url);
    return ((d.feed && d.feed.entry) || []).map(normalize);
  }
  async function search(q, n){
    const url = `${base()}/feeds/posts/summary?q=${encodeURIComponent(q)}&max-results=${n || 3}`;
    const d = await getJSON(url);
    return ((d.feed && d.feed.entry) || []).map(normalize);
  }
  const norm = s => s.replace(/[ًٌٍَُِّْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  // يرجّع أنسب منشور لوصفة معيّنة (أو null)
  async function matchRecipe(recipe){
    const key = "aqx-match-" + recipe.id;
    try { const c = sessionStorage.getItem(key); if (c) return JSON.parse(c); } catch(e){}
    let found = null;
    try {
      const words = norm(recipe.title).split(" ").filter(w => w.length > 2 && !["بال","مع","في"].includes(w));
      const list = await search(recipe.bloggerQuery || recipe.title, 5);
      found = list.find(p => words.some(w => norm(p.title).includes(w))) || null;
    } catch(e){}
    try { sessionStorage.setItem(key, JSON.stringify(found)); } catch(e){}
    return found;
  }
  A.blogger = { byLabel, search, matchRecipe,
    labelUrl: l => `${base()}/search/label/${encodeURIComponent(l)}`,
    searchUrl: q => `${base()}/search?q=${encodeURIComponent(q)}` };
})();
