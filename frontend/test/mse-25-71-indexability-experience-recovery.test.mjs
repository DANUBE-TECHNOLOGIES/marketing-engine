import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..");

const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const commonPartners = read("components/page-builder/shared/commonPartners.js");
const publicSections = read("components/public-site/PublicSiteSections.js");
const partnersRenderer = read("components/public-site/renderers/PartnersRenderer.js");
const partnerDirectoryRenderer = read("components/public-site/renderers/PartnerDirectoryRenderer.js");

const REQUIRED_PARTNER_ASSETS = [
  "fram.webp",
  "tui-official.webp",
  "club-lookea.webp",
  "club-marmara.webp",
  "nouvelles-frontieres.webp",
  "club-med-official.webp",
  "msc-croisieres.webp",
  "costa-croisieres.webp",
  "kuoni-official.webp",
  "exotismes.webp",
];

test("MSE-25.71 keeps every reference partner logo in the public build", () => {
  for (const filename of REQUIRED_PARTNER_ASSETS) {
    const relative = path.join("public", "partners", filename);
    assert.equal(fs.existsSync(path.join(ROOT, relative)), true, `missing public partner asset: ${relative}`);
    assert.match(commonPartners, new RegExp(`/partners/${filename.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}`));
  }
});

test("MSE-25.71 keeps real logo rendering on the Home and partner directory", () => {
  assert.match(partnersRenderer, /safePartnerAssetUrl/);
  assert.match(partnersRenderer, /<img\s+src=/);
  assert.match(partnerDirectoryRenderer, /getPartnerDirectoryCategories/);
  assert.match(partnerDirectoryRenderer, /profile\.logoUrl/);
  assert.match(partnerDirectoryRenderer, /<img\s+src=/);
});

test("MSE-25.71 keeps the secondary-page cleanup pass enabled", () => {
  assert.match(publicSections, /function\s+compactSecondarySections/);
  assert.match(publicSections, /secondarySectionSuppressed/);
  assert.match(publicSections, /secondaryPresentationRank/);
  assert.match(publicSections, /isTeamPage/);
  assert.match(publicSections, /isPartnersPage/);
  assert.match(publicSections, /compactSecondarySections\([\s\S]*sortSections/);
});

test("MSE-25.71 suppresses the known duplicate headings restored during recovery", () => {
  assert.match(publicSections, /page-header/);
  assert.match(publicSections, /team-introduction/);
  assert.match(publicSections, /partners-introduction/);
  assert.match(publicSections, /notre équipe/);
  assert.match(publicSections, /nos partenaires/);
});
