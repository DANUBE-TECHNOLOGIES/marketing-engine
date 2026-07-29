"use strict";
const { flatten, clean } = require("./utils");
function analyzeMedia(page = {}) {
  const payloads = (page.sections || []).map(section => section.jsonContent || section.content || section);
  const flat = flatten(payloads);
  const images = flat.filter(item => /^(src|image|imageurl|heroimageurl)$/i.test(item.key) && clean(item.value));
  const alts = flat.filter(item => /^(alt|alttext|imagealt)$/i.test(item.key) && clean(item.value));
  const covered = images.length === 0 || alts.length >= images.length;
  return { imageCount: images.length, altCount: alts.length, checks: [
    rule("media.alt", covered, 6, "warning", "Ajouter un texte alternatif descriptif à chaque image.", { images: images.length, alts: alts.length })
  ]};
}
function rule(id, passed, weight, severity, recommendation, details) { return { id, category: "media", passed, weight, severity, recommendation, details: details || null }; }
module.exports = { analyzeMedia };
