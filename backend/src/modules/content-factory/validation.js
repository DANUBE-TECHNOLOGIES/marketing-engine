"use strict";
const { ValidationError } = require("../../core/errors");
const { clean } = require("./slug");
function validateInput(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ValidationError("Le corps JSON doit être un objet.");
  const destinationSlug = clean(raw.destinationSlug);
  if (!destinationSlug) throw new ValidationError("destinationSlug est obligatoire.");
  const siteId = clean(raw.siteId) || null;
  const siteSlug = clean(raw.siteSlug) || null;
  const persist = raw.persist === true;
  if (persist && !siteId && !siteSlug) throw new ValidationError("siteId ou siteSlug est obligatoire lorsque persist=true.");
  const limit = Math.max(1, Math.min(20, Number(raw.limit) || 10));
  const pageKinds = Array.isArray(raw.pageKinds) ? raw.pageKinds.map(clean).filter(Boolean) : [];
  return { destinationSlug, siteId, siteSlug, persist, replace: raw.replace === true, limit, pageKinds, actor: clean(raw.actor) || "content-factory" };
}
module.exports = { validateInput };
