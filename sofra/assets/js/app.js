import { ramadanDay, parseDayParam, pickByDay, formatItem, buildPlan, totalMinutes, selectedIngredients } from "./logic.js";
import { fetchLabelPosts, parseIngredients, labelUrl } from "./blogger.js";
import { loadChecked, saveChecked, loadSelection, saveSelection, toText, whatsappUrl } from "./shopping.js";

const $ = (s) => document.querySelector(s);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  day: 0,
  slots: [],
  resolved: {},
  selected: new Set(),
  checked: new Set(),
  buttons: [],
  shopVisible: false
};

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    n.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return n;
}

const getJSON = async (path) => {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
};

const ingredientsOf = (r) => (r.source === "local" ? r.recipe.ingredients : r.ingredients || []);
const canAdd = (r) => !!r && ingredientsOf(r).length > 0;

/* ---------- تحديد وصفة كل خانة ---------- */
async function resolveSlot(slot, idx, ctx) {
  const { day, cfg, menus, recipes } = ctx;

  const pinnedId = menus.overrides?.[String(day)]?.[slot.key];
  const pinned = pinnedId
    ? recipes.find((r) => r.id === pinnedId)
    : recipes.find((r) => r.slot === slot.key && r.day === day);
  if (pinned) return { slot, source: "local", title: pinned.title, recipe: pinned, image: pinned.image };

  for (const label of slot.labels) {
    const posts = await fetchLabelPosts(cfg, label);
    const post = pickByDay(posts, day, idx);
    if (post) {
      return {
        slot,
        source: "blogger",
        label,
        title: post.title,
        url: post.url,
        image: post.image,
        ingredients: parseIngredients(post.html)
      };
    }
  }

  const fallback = pickByDay(recipes.filter((r) => r.slot === slot.key), day);
  if (fallback) return { slot, source: "local", title: fallback.title, recipe: fallback, image: fallback.image };
  return null;
}

/* ---------- زر الإضافة لقائمة التسوق ---------- */
function paintButton(key, b) {
  const on = state.selected.has(key);
  b.setAttribute("aria-pressed", String(on));
  b.textContent = on ? "✓ في قائمة التسوق" : "🛒 أضف للقائمة";
}

function cartButton(key) {
  const b = el("button", { class: "btn cart", type: "button" });
  b.addEventListener("click", () => {
    toggle(key);
    b.classList.remove("pop");
    if (!reduceMotion) {
      void b.offsetWidth;
      b.classList.add("pop");
    }
  });
  state.buttons.push({ key, b });
  paintButton(key, b);
  return b;
}

function toggle(key) {
  if (state.selected.has(key)) state.selected.delete(key);
  else state.selected.add(key);
  saveSelection(state.day, state.selected);
  refresh();
}

function addableKeys() {
  return state.slots.filter((s) => canAdd(state.resolved[s.key])).map((s) => s.key);
}

function toggleAll() {
  const keys = addableKeys();
  const allOn = keys.every((k) => state.selected.has(k));
  state.selected = new Set(allOn ? [] : keys);
  saveSelection(state.day, state.selected);
  refresh();
}

/* ---------- الرسم ---------- */
function arch(r) {
  const img = r.image ? el("img", { src: r.image, alt: r.title, loading: "lazy" }) : el("span", { "aria-hidden": "true", text: r.slot.icon });
  return el("div", { class: `arch${r.image ? "" : " ph"}` }, img);
}

function chip(icon, text) {
  return el("span", { class: "chip" }, `${icon} ${text}`);
}

function renderHero(main, day, inRamadan) {
  const box = $("#hero");
  box.replaceChildren();
  if (!main) {
    box.append(el("p", { class: "sub", text: "لا توجد وصفة متاحة لهذا اليوم بعد." }));
    return;
  }
  const r = main.recipe;
  const mins = totalMinutes(r);
  const chips = [];
  if (mins) chips.push(chip("⏱️", `${mins} دقيقة`));
  if (r?.servings) chips.push(chip("👨‍👩‍👧‍👦", `تكفي ${r.servings} أفراد`));
  if (r?.difficulty) chips.push(chip("⭐", `${r.difficulty} التحضير`));
  if (r?.priceEGP) chips.push(chip("💰", `حوالي ${r.priceEGP} جنيه`));
  if (r?.meal) chips.push(chip("🍽️", r.meal));

  const subtitle = inRamadan ? `وصفة مختارة ليوم ${day} رمضان` : `وصفة مختارة لهذا اليوم`;
  const actions = el("div", { class: "actions" },
    canAdd(main) ? cartButton("main") : null,
    main.source === "blogger"
      ? el("a", { class: "btn solid", href: main.url, target: "_blank", rel: "noopener", text: "شاهد الوصفة كاملة" })
      : null
  );

  const info = el("div", {},
    el("span", { class: "tag", text: "وصفة اليوم" }),
    el("h2", { class: "hero-title", text: main.title }),
    el("p", { class: "sub", text: subtitle }),
    chips.length ? el("div", { class: "chips" }, chips) : null,
    r ? el("p", { class: "intro", text: r.description }) : null,
    actions
  );

  box.append(el("div", { class: "hero-grid" }, arch(main), info));

  const ings = r ? r.ingredients.map(formatItem) : main.ingredients || [];
  if (ings.length || r) {
    box.append(
      el("div", { class: "cols" },
        el("div", {}, el("h3", { text: "المكونات" }), el("ul", { class: "ing" }, ings.map((t) => el("li", { text: t })))),
        r ? el("div", {}, el("h3", { text: "طريقة التحضير" }), el("ol", { class: "steps" }, r.steps.map((s) => el("li", { text: s })))) : null
      )
    );
  }
}

function renderSofra(cfg) {
  const grid = $("#sofra-grid");
  grid.replaceChildren();
  for (const slot of state.slots) {
    if (slot.key === "main") continue;
    const r = state.resolved[slot.key];
    if (!r) continue;

    const body = [
      el("p", { class: "slot", text: `${slot.icon} ${slot.title}` }),
      el("h3", { text: r.title }),
      el("div", { class: "row" },
        canAdd(r) ? cartButton(slot.key) : null,
        r.source === "blogger"
          ? el("a", { class: "btn", href: r.url, target: "_blank", rel: "noopener", text: "شاهد الوصفة" })
          : null
      )
    ];

    if (r.source === "local") {
      body.push(
        el("details", {},
          el("summary", { text: "عرض الوصفة هنا" }),
          el("h4", { text: "المكونات" }),
          el("ul", {}, r.recipe.ingredients.map((i) => el("li", { text: formatItem(i) }))),
          el("h4", { text: "الطريقة" }),
          el("ol", {}, r.recipe.steps.map((s) => el("li", { text: s })))
        )
      );
    } else {
      body.push(el("a", { class: "more", href: labelUrl(cfg, r.label), target: "_blank", rel: "noopener", text: `المزيد من قسم ${r.label}` }));
    }

    grid.append(el("article", { class: "card" }, arch(r), body));
  }
}

function renderPlan(planOrder) {
  $("#plan").replaceChildren(...buildPlan(state.resolved, planOrder).map((s) => el("li", { text: s })));
}

function currentItems() {
  return selectedIngredients(state.resolved, state.selected);
}

function renderShopping() {
  const items = currentItems();
  $("#shop-count").textContent = items.length;

  const names = state.slots.filter((s) => state.selected.has(s.key) && canAdd(state.resolved[s.key])).map((s) => state.resolved[s.key].title);
  $("#shop-sel").replaceChildren(...names.map((n) => el("span", { text: n })));

  const box = $("#shopping");
  if (!items.length) {
    box.replaceChildren(el("p", { class: "empty", text: "قائمتك فاضية. اضغط «أضف للقائمة» على أي طبق من المائدة." }));
    return;
  }
  box.replaceChildren(
    ...items.map((it) => {
      const label = formatItem(it);
      const cb = el("input", { type: "checkbox" });
      cb.checked = state.checked.has(label);
      const row = el("label", { class: `shop-row${cb.checked ? " done" : ""}` }, cb, el("span", { text: label }));
      cb.addEventListener("change", () => {
        if (cb.checked) state.checked.add(label);
        else state.checked.delete(label);
        saveChecked(state.day, state.checked);
        row.classList.toggle("done", cb.checked);
      });
      return row;
    })
  );
}

function refresh() {
  for (const { key, b } of state.buttons) paintButton(key, b);
  renderShopping();
  const keys = addableKeys();
  $("#shop-all").textContent = keys.length && keys.every((k) => state.selected.has(k)) ? "إزالة السفرة كلها" : "أضف السفرة كلها";
  const n = currentItems().length;
  $("#cart-count").textContent = n;
  updatePill(n);
}

function updatePill(n = currentItems().length) {
  $("#cart-pill").classList.toggle("show", n > 0 && !state.shopVisible);
}

/* ---------- التمرير: شريط التقدم وسهم الرجوع ---------- */
function setupScroll() {
  const bar = $("#progress");
  const up = $("#to-top");
  let ticking = false;

  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = `${max > 0 ? Math.min(100, (scrollY / max) * 100) : 0}%`;
    up.classList.toggle("show", scrollY > 500);
    ticking = false;
  };
  addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  addEventListener("resize", update);
  update();

  up.addEventListener("click", () => scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }));
  $("#cart-pill").addEventListener("click", () =>
    $("#shop-section").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })
  );

  new IntersectionObserver((entries) => {
    state.shopVisible = entries[0].isIntersecting;
    updatePill();
  }, { threshold: 0.15 }).observe($("#shop-section"));
}

function setupShoppingActions(title) {
  $("#shop-all").onclick = toggleAll;
  $("#shop-clear").onclick = () => {
    state.checked.clear();
    saveChecked(state.day, state.checked);
    renderShopping();
  };
  $("#shop-copy").onclick = async () => {
    const btn = $("#shop-copy");
    try {
      await navigator.clipboard.writeText(toText(currentItems(), state.checked, title));
      btn.textContent = "تم النسخ ✓";
    } catch {
      btn.textContent = "تعذر النسخ";
    }
    setTimeout(() => (btn.textContent = "نسخ القائمة"), 2000);
  };
  $("#shop-wa").onclick = () => window.open(whatsappUrl(toText(currentItems(), state.checked, title)), "_blank", "noopener");
}

async function main() {
  setupScroll();
  try {
    const [cfg, menus, recipes] = await Promise.all([
      getJSON("data/config.json"),
      getJSON("data/menus.json"),
      getJSON("data/recipes.json")
    ]);

    const forced = parseDayParam(location.search, cfg.ramadanLength);
    const auto = ramadanDay(new Date(), cfg.ramadanStart, cfg.ramadanLength);
    const day = forced ?? auto.day;
    const inRamadan = forced ? true : auto.inRamadan;

    state.day = day;
    state.slots = menus.slots;
    state.checked = loadChecked(day);

    $("#day-num").textContent = day.toLocaleString("ar-EG");
    $("#day-cap").textContent = inRamadan ? "من رمضان" : "من أيام السفرة";

    const ctx = { day, cfg, menus, recipes };
    const list = await Promise.all(menus.slots.map((s, i) => resolveSlot(s, i, ctx)));
    menus.slots.forEach((s, i) => (state.resolved[s.key] = list[i]));

    // أول زيارة في اليوم: كل السفرة مضافة، وبعدها نحترم اختيار الزائر
    const saved = loadSelection(day);
    state.selected = saved ?? new Set(addableKeys());

    renderHero(state.resolved.main, day, inRamadan);
    renderSofra(cfg);
    renderPlan(menus.planOrder);
    setupShoppingActions(`قائمة تسوق سفرة اليوم ${day}`);
    $("#shop-note").textContent = cfg.shoppingPageNote;
    refresh();

    $("#loading").hidden = true;
    $("#app").hidden = false;
  } catch (err) {
    console.error(err);
    $("#loading").textContent = "تعذر تحميل الصفحة. شغّلها من خادم (مثل GitHub Pages) وليس بفتح الملف مباشرة.";
  }
}

main();
