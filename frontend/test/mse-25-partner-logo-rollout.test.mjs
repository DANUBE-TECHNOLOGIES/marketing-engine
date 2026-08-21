import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

function isPendingOrFinalized(id, backlog, catalogue) {
  return new RegExp(`id:\\s*"${id}"[^\\n]*state:\\s*"source-pending"`).test(backlog)
    || new RegExp(`P\\("${id}"[^\\n]*"\\/partners\\/${id}\\.(?:svg|webp)"\\)`).test(catalogue);
}

test("batch partner logo rollout processes vetted sources and preserves legal holds across lifecycle states", () => {
  const rollout = read("scripts/partner-logo-rollout.mjs");
  const acquire = read("scripts/partner-logo-acquire.mjs");
  const backlog = read("components/page-builder/shared/partnerLogoBacklog.js");
  const catalogue = read("components/page-builder/shared/fullPartners.js");

  assert.match(rollout, /item\.state === "source-vetted"/);
  assert.match(rollout, /item\.state === "permission-required"/);
  assert.match(rollout, /partner-logo-acquire\.mjs/);
  assert.match(rollout, /partner-logo-catalogue-sync\.mjs/);
  assert.match(rollout, /partner-logo-finalize\.mjs/);
  assert.match(rollout, /--write=true/);
  assert.match(acquire, /requiredState: "source-vetted"/);
  assert.match(acquire, /source\.status !== "vetted-source"/);
  assert.match(acquire, /validateSvg/);
  assert.match(acquire, /2 \* 1024 \* 1024/);

  assert.doesNotMatch(backlog, /id:\s*"catlante-catamarans"/);
  assert.match(backlog, /ponant[\s\S]*state: "permission-required"/);
  assert.ok(isPendingOrFinalized("rivages-du-monde", backlog, catalogue));
});
