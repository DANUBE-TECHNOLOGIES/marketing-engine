import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.8 launch cockpit reads the tenant-scoped backend endpoint", () => {
  const source = read("app/agency-launch/page.js");

  assert.match(source, /\/api\/agency-launch\/network/);
  assert.match(source, /x-tenant-slug/);
  assert.match(source, /NEXT_PUBLIC_TENANT_SLUG/);
});

test("MSE-25.8 launch cockpit exposes builder and public-site actions", () => {
  const source = read("app/agency-launch/page.js");

  assert.match(source, /\/website-builder\?agencyId=/);
  assert.match(source, /\/agence\/\$\{site\.slug\}/);
  assert.match(source, /Prêtes à publier/);
  assert.match(source, /Aucun blocage obligatoire/);
  assert.match(source, /state\.code === "ready_to_publish"/);
  assert.match(source, /PublishSiteButton/);
});

test("MSE-25.8 publish action always checks an executable plan before publishing", () => {
  const source = read("app/agency-launch/PublishSiteButton.js");

  assert.match(source, /\/plan/);
  assert.match(source, /plan\.executable/);
  assert.match(source, /plan\.planToken/);
  assert.match(source, /\/publish/);
  assert.match(source, /force:\s*false/);
});

test("MSE-25.8 site-publication proxy forwards tenant context", () => {
  const source = read("app/api/site-publication/[[...path]]/route.js");

  assert.match(source, /x-tenant-id/);
  assert.match(source, /x-tenant-slug/);
  assert.match(source, /mondescale/);
});

test("MSE-25.8 admin network exposes the launch cockpit", () => {
  const source = read("app/admin-network/page.js");

  assert.match(source, /Mise en ligne mini-sites/);
  assert.match(source, /\/agency-launch/);
});
