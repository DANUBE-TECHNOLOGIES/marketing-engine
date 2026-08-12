"use strict";

function pageSlugCandidates(slug) {
  const normalized = String(slug ?? "").trim();
  if (normalized === "home" || normalized === "") return ["home", ""];
  return [normalized];
}

module.exports = { pageSlugCandidates };
