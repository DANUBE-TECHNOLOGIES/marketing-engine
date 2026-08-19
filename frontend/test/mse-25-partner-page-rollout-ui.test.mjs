import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("website builder exposes a safe network partner page rollout cockpit", () => {
  const launcher = read("components/website-builder/WebsiteBuilderLauncher.js");
  const css = read("components/website-builder/WebsiteBuilderLauncher.module.css");

  assert.match(launcher, /\/api\/website-builder\/partners\/rollout/);
  assert.match(launcher, /body: JSON\.stringify\(\{ confirmed: true \}\)/);
  assert.match(launcher, /Crée uniquement les pages/);
  assert.match(launcher, /aucune publication n’est automatique/);
  assert.match(launcher, /partnerRollout\.summary\.missing/);
  assert.match(launcher, /partnerRollout\.summary\.published/);
  assert.match(launcher, /partnerRollout\.summary\.draftOrReview/);
  assert.match(launcher, /partnerStateLabel/);
  assert.match(launcher, /data-partner-state=\{partnerState \|\| "unknown"\}/);
  assert.doesNotMatch(launcher, /publishPartner/);

  assert.match(css, /\.partnerRollout/);
  assert.match(css, /\.rolloutStats/);
  assert.match(css, /data-partner-state="published"/);
  assert.match(css, /data-partner-state="missing"/);
});

test("website builder proxy forwards rollout audit and confirmed creation to the backend", () => {
  const route = read("app/api/website-builder/partners/rollout/route.js");

  assert.match(route, /agency-sites\/partners\/rollout/);
  assert.match(route, /"x-tenant-slug": TENANT_SLUG/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /method === "POST" \? JSON\.stringify/);
  assert.match(route, /cache: "no-store"/);
});
