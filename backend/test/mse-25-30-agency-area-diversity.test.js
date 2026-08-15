"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildLocalAreaContent } = require("../src/modules/minisite-seo-enrichment/local-differentiator");

function normalized(value) {
  return String(value || "")
    .replace(/Gien|Dax|Montargis|Amilly|Orléans|Capbreton|Soustons|Hossegor/gi, "VILLE")
    .replace(/Mondescale\s+VILLE/gi, "Mondescale")
    .replace(/\s+/g, " ")
    .trim();
}

test("agency local-area copy remains stable per agency and differs across agency ids", () => {
  const page = { slug: "agence", title: "Notre agence", published: true };
  const leftArgs = {
    agency: { id: 1, name: "Mondescale Gien", city: "Gien" },
    page,
    targetCities: ["Montargis", "Amilly", "Orléans"],
  };
  const rightArgs = {
    agency: { id: 3, name: "Mondescale Dax", city: "Dax" },
    page,
    targetCities: ["Capbreton", "Soustons", "Hossegor"],
  };

  const left = buildLocalAreaContent(leftArgs);
  const leftAgain = buildLocalAreaContent(leftArgs);
  const right = buildLocalAreaContent(rightArgs);

  assert.deepEqual(left, leftAgain);
  assert.ok(left?.html);
  assert.ok(right?.html);
  assert.notEqual(normalized(left.html), normalized(right.html));
});
