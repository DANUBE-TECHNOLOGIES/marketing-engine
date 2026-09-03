"use strict";

function clean(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function stripHtml(value) {
  return clean(String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function words(value) {
  const text = stripHtml(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return text.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9'-]+/g) || [];
}

function flatten(value, path = [], out = []) {
  if (value === null || value === undefined) return out;
  if (typeof value === "string") out.push({ path, key: String(path[path.length - 1] || ""), value });
  else if (Array.isArray(value)) value.forEach((item, index) => flatten(item, path.concat(index), out));
  else if (typeof value === "object") Object.entries(value).forEach(([key, item]) => flatten(item, path.concat(key), out));
  return out;
}

function collectByKeys(value, keys) {
  const wanted = new Set(keys.map(key => key.toLowerCase()));
  return flatten(value).filter(item => wanted.has(item.key.toLowerCase())).map(item => clean(item.value)).filter(Boolean);
}

function unique(values) { return [...new Set(values.filter(Boolean))]; }

module.exports = { clean, stripHtml, words, flatten, collectByKeys, unique };
