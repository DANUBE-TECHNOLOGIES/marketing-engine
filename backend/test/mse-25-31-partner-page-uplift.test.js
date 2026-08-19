const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const backendRoot = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(backendRoot, relativePath), "utf8");

test("existing minisites can safely receive the partner page without destructive rebuild", () => {
  const service = read("src/modules/agency-site/service.js");
  const routes = read("src/modules/agency-site/routes.js");
  const repository = read("src/modules/agency-site/repository.js");

  assert.match(service, /ensureRequiredPages\(agencyId,requiredKeys=\["home","agence","partners","services","contact"\]\)/);
  assert.match(service, /async ensurePartnerPage\(agencyId,input=\{\}\)/);
  assert.match(service, /input\.confirmed!==true/);
  assert.match(service, /PARTNER_PAGE_CONFIRMATION_REQUIRED/);
  assert.match(service, /ensureRequiredPages\(agencyId,\["agence","partners"\]\)/);
  assert.match(service, /String\(page\.slug\|\|""\)==="partenaires"/);
  assert.match(service, /published:Boolean\(partnerPage\.published\)/);

  assert.match(routes, /post\("\/agencies\/:id\/site\/partners\/ensure"/);
  assert.match(routes, /ensurePartnerPageOnly\(service, req\.params\.id, req\.body \|\| \{\}\)/);

  assert.match(repository, /async createDraftPage/);
  assert.match(repository, /status:"draft",published:false/);
  assert.match(repository, /if\(existing\)return\{created:false,reason:"PAGE_ALREADY_EXISTS"/);
});

test("generated partner page copy is local, useful and avoids availability promises", () => {
  const contentBuilder = read("src/modules/agency-site/builders/content-builder.js");

  assert.match(contentBuilder, /Des partenaires sélectionnés par votre agence à \$\{city\}/);
  assert.match(contentBuilder, /\$\{name\} s’appuie sur un réseau de tour-opérateurs, croisiéristes et spécialistes/);
  assert.match(contentBuilder, /vérifier les disponibilités, les conditions et la solution réellement pertinente/);
});