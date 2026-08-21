import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("batch partner logo rollout only processes vetted sources and preserves legal holds", () => {
  const rollout = read("scripts/partner-logo-rollout.mjs");
  const acquire = read("scripts/partner-logo-acquire.mjs");
  const backlog = read("components/page-builder/shared/partnerLogoBacklog.js");

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

  // Finalized partners must leave the active work backlog; legal holds must remain explicit.
  assert.doesNotMatch(backlog, /id:\s*"catlante-catamarans"/);
  assert.match(backlog, /ponant[\s\S]*state: "permission-required"/);
  assert.match(backlog, /rivages-du-monde[\s\S]*state: "source-pending"/);
});
