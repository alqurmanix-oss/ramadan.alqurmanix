// الربط مع Blogger عن طريق فيد JSON العام (بدون مفتاح API)

function cacheGet(key, minutes) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    return Date.now() - t < minutes * 60000 ? v : null;
  } catch {
    return null;
  }
}

function cacheSet(key, v) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), v }));
  } catch {
    /* التخزين ممتلئ أو غير متاح */
  }
}

function bigImage(url) {
  if (!url) return null;
  return url.replace(/\/s\d+(-c)?\//, "/s800/");
}

function normalizeEntry(e) {
  const link = (e.link || []).find((l) => l.rel === "alternate");
  return {
    id: e.id?.$t || "",
    title: e.title?.$t || "",
    url: link ? link.href : "",
    image: bigImage(e["media$thumbnail"]?.url),
    labels: (e.category || []).map((c) => c.term),
    html: e.content?.$t || e.summary?.$t || "",
    published: e.published?.$t || ""
  };
}

/** يرجع مقالات قسم (Label) من المدونة. يرجع [] لو فشل. */
export async function fetchLabelPosts(cfg, label) {
  const key = `aqx-label-${label}`;
  const cached = cacheGet(key, cfg.cacheMinutes);
  if (cached) return cached;

  const url = `${cfg.bloggerBase}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${cfg.postsPerLabel}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.requestTimeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return [];
    const json = await res.json();
    const posts = (json.feed?.entry || []).map(normalizeEntry).filter((p) => p.url);
    // نخزّن بدون المحتوى الكامل علشان حجم التخزين، ونرجع المحتوى للمقال المختار بس
    cacheSet(key, posts.map((p) => ({ ...p, html: p.html.length > 60000 ? "" : p.html })));
    return posts;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** استخراج المكونات من محتوى المقال: أول قائمة بعد عنوان فيه "المكونات". */
export function parseIngredients(html) {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("style,script").forEach((n) => n.remove());

  const heads = [...doc.querySelectorAll("h1,h2,h3,h4,h5,strong,b,p,div,span")].filter((n) => {
    const t = (n.textContent || "").trim();
    return t.length > 0 && t.length < 40 && t.includes("المكونات");
  });

  for (const h of heads) {
    let node = h;
    for (let hop = 0; hop < 6 && node; hop++) {
      let sib = node.nextElementSibling;
      while (sib) {
        const lis = sib.matches("ul,ol") ? [...sib.querySelectorAll("li")] : [...sib.querySelectorAll("ul li, ol li")];
        if (lis.length) {
          return lis.map((li) => li.textContent.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 40);
        }
        if (/^H[1-4]$/.test(sib.tagName) && sib !== h) break;
        sib = sib.nextElementSibling;
      }
      node = node.parentElement;
    }
  }
  return [];
}

export function labelUrl(cfg, label) {
  return `${cfg.bloggerBase}/search/label/${encodeURIComponent(label)}`;
      }
