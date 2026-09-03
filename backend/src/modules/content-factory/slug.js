"use strict";
function clean(value) { return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""; }
function slugify(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}
module.exports = { clean, slugify };
