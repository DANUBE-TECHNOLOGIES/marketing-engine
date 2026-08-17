import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const read = (relativePath) => fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");

test("logo catalogue sync is explicit and refuses ambiguous public assets", () => {
  const sync = read("scripts/partner-logo-catalogue-sync.mjs");
  assert.match(sync, /assets\.length !== 1/);
  assert.match(sync, /multiple-public-assets-found/);
  assert.match(sync, /public-asset-not-found/);
  assert.match(sync, /writeRequested:\s*write/);
  assert.match(sync, /if \(write\) fs\.writeFileSync/);
});

test("logo finalization requires an activated vetted asset and preserves source provenance", () => {
  const finalize = read("scripts/partner-logo-finalize.mjs");
  const registryAudit = read("scripts/partner-logo-source-registry-audit.mjs");
  assert.match(finalize, /backlog\.state !== "source-vetted"/);
  assert.match(finalize, /source\.status !== "vetted-source"/);
  assert.match(finalize, /catalogue-logo-not-activated/);
  assert.match(finalize, /catalogue-logo-does-not-match-partner/);
  assert.match(finalize, /activated-public-asset-missing-or-invalid/);
  assert.match(finalize, /retainedSourceProvenance:\s*true/);
  assert.match(finalize, /if \(write\) fs\.writeFileSync\(backlogPath/);
  assert.match(registryAudit, /activated-logo-still-in-work-backlog/);
});
