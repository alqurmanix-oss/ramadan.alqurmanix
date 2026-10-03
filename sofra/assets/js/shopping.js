// قائمة التسوق: حفظ علامات الشراء على الجهاز + نسخ ومشاركة

import { formatItem } from "./logic.js";

const keyFor = (day) => `aqx-shop-checked-${day}`;

export function loadChecked(day) {
  try {
    return new Set(JSON.parse(localStorage.getItem(keyFor(day)) || "[]"));
  } catch {
    return new Set();
  }
}

export function saveChecked(day, set) {
  try {
    localStorage.setItem(keyFor(day), JSON.stringify([...set]));
  } catch {
    /* تجاهل */
  }
}

export function toText(items, checked, title) {
  const lines = items.map((it) => `${checked.has(formatItem(it)) ? "☑" : "☐"} ${formatItem(it)}`);
  return `🛒 ${title}\n\n${lines.join("\n")}`;
}

export function whatsappUrl(text) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

const selKey = (day) => `aqx-shop-selected-${day}`;

/** الوصفات المضافة للقائمة في هذا اليوم. null = لم يختر الزائر بعد. */
export function loadSelection(day) {
  try {
    const raw = localStorage.getItem(selKey(day));
    return raw === null ? null : new Set(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveSelection(day, set) {
  try {
    localStorage.setItem(selKey(day), JSON.stringify([...set]));
  } catch {
    /* تجاهل */
  }
}
