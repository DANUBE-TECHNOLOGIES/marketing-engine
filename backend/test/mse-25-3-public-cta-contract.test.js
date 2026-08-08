"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function frontendFile(relativePath) {
  return fs.readFileSync(
    path.resolve(
      __dirname,
      "../../frontend/components/public-site/renderers",
      relativePath
    ),
    "utf8"
  );
}

test("MSE-25.3 branche les renderers Hero et CTA V2 dans le registry public", () => {
  const registry = frontendFile("registry.js");

  assert.match(registry, /hero:\s*HeroV2Renderer/);
  assert.match(registry, /cta:\s*CtaV2Renderer/);
});

test("MSE-25.3 respecte les href configurés et bloque les protocoles dangereux", () => {
  const helper = frontendFile("ctaLinks.js");
  const hero = frontendFile("HeroV2Renderer.js");
  const cta = frontendFile("CtaV2Renderer.js");

  assert.match(helper, /javascript:\|data:\|vbscript:/);
  assert.match(helper, /https\?:\|mailto:\|tel:/);
  assert.match(hero, /primaryCta\.href/);
  assert.match(hero, /secondaryCta\.href/);
  assert.match(cta, /resolvePublicCtaHref/);
});

test("MSE-25.3 rend l'ancre de contact V2 réellement navigable", () => {
  const contact = frontendFile("ContactRenderer.js");

  assert.match(contact, /id="contact"/);
});
