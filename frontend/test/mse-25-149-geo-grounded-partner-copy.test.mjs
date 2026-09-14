import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const summaryRenderer = readFileSync(new URL("../components/public-site/renderers/PartnersRenderer.js", import.meta.url), "utf8");
const directoryRenderer = readFileSync(new URL("../components/public-site/renderers/PartnerDirectoryRenderer.js", import.meta.url), "utf8");
const localContext = readFileSync(new URL("../components/public-site/LocalContentContext.js", import.meta.url), "utf8");

const combined = `${summaryRenderer}\n${directoryRenderer}\n${localContext}`;

test("MSE-25.149 partner copy uses publication/configuration language", () => {
  assert.match(combined, /partenaires actuellement publiés/i);
  assert.match(combined, /sélection complémentaire configurée/i);
  assert.match(combined, /informations publiées/i);
});

test("MSE-25.149 removes unsupported trust, regular-use and project-fit claims", () => {
  assert.doesNotMatch(combined, /partenaires de confiance/i);
  assert.doesNotMatch(combined, /mobilisons régulièrement/i);
  assert.doesNotMatch(combined, /spécialistes adaptés à votre projet/i);
  assert.doesNotMatch(combined, /spécialistes complémentaires de votre agence/i);
});

test("MSE-25.149 does not turn partner copy into agency expertise or transactional authority", () => {
  assert.doesNotMatch(combined, /knowsAbout/);
  assert.doesNotMatch(combined, /prix disponible|disponibilité garantie|réservation garantie/i);
});
