import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const readFrontend = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");
const readRepo = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

test("MSE-25.77 keeps the recovered public renderer contract", () => {
  const registry = readFrontend("components/public-site/renderers/registry.js");

  assert.match(registry, /PageHeaderRenderer/);
  assert.match(registry, /FlexiblePaymentRenderer/);
  assert.match(registry, /"page-header":\s*PageHeaderRenderer/);
  assert.match(registry, /"partner-categories":\s*PartnerDirectoryRenderer/);
  assert.match(registry, /flexible_payment:\s*FlexiblePaymentRenderer/);
  assert.match(registry, /"flexible-payment":\s*FlexiblePaymentRenderer/);
});

test("partner page remains a full catalogue while home stays compact", () => {
  const partners = readFrontend("components/public-site/renderers/PartnersRenderer.js");
  const directory = readFrontend("components/public-site/renderers/PartnerDirectoryRenderer.js");
  const catalogue = readFrontend("components/page-builder/shared/fullPartners.js");

  assert.match(partners, /pageIsHome/);
  assert.match(partners, /PartnerDirectoryRenderer/);
  assert.match(partners, /if \(!pageIsHome\(page\)\)/);
  assert.match(directory, /getPartnerDirectoryCategories/);
  assert.match(directory, /getPublishablePartnerProfiles/);

  for (const expectedLogo of [
    "/partners/manual/croisieurope.webp",
    "/partners/manual/ponant.webp",
    "/partners/manual/boomerang.webp",
    "/partners/manual/asia.webp",
  ]) {
    assert.match(catalogue, new RegExp(expectedLogo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("team and flexible payment renderers remain available", () => {
  const team = readFrontend("components/public-site/renderers/TeamRenderer.js");
  const payment = readFrontend("components/public-site/renderers/FlexiblePaymentRenderer.js");
  const sections = readFrontend("components/public-site/PublicSiteSections.js");

  assert.match(team, /getSectionContent/);
  assert.match(team, /members|items|team/);
  assert.match(payment, /normalizeInstallmentCounts/);
  assert.match(payment, /Paiement possible en/);
  assert.match(payment, /flexible_payment_cta/);
  assert.match(sections, /\["team", "equipe", "team-grid", "equipe-grid"\]/);
});

test("home exposes a single dedicated reassurance block", () => {
  const page = readFrontend("app/agence/[siteSlug]/[[...pageSlug]]/page.js");
  const reassurance = readFrontend("components/public-site/PublicReassuranceBand.js");
  const layout = readFrontend("app/agence/[siteSlug]/layout.js");

  assert.match(page, /PublicReassuranceBand/);
  assert.match(page, /isHomePage\(pageSlug\) \? <PublicReassuranceBand \/>/);
  assert.match(layout, /public-reassurance-band\.css/);

  for (const expected of [
    "Carte bancaire",
    "VISA",
    "Mastercard",
    "American Express",
    "CEDIV Travel",
    "Les Entreprises du Voyage",
    "Atout France",
    "GROUPAMA",
    "Garantie financière & RCP",
  ]) {
    assert.match(reassurance, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("reconvergence preserves the split-runtime backend network", () => {
  const compose = readRepo("docker-compose.yml");

  assert.match(compose, /networks:\n\s+- default\n\s+- runtime/);
  assert.match(compose, /MONDESCALE_RUNTIME_NETWORK:-mondescale-local-engine_default/);
  assert.match(compose, /BACKEND_INTERNAL_URL:\s*"http:\/\/backend:4000"/);
});
