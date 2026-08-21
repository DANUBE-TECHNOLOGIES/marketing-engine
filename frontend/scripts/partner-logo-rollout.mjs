import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const sharedRoot = path.join(frontendRoot, "components/page-builder/shared");
const write = process.argv.includes("--write=true");
const finalize = process.argv.includes("--finalize=true");

async function loadModule(fileName) {
  const source = fs.readFileSync(path.join(sharedRoot, fileName), "utf8");
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(url);
}

const backlogModule = await loadModule("partnerLogoBacklog.js");
const backlog = backlogModule.PARTNER_LOGO_BACKLOG || [];
const eligible = backlog.filter((item) => item.state === "source-vetted");
const blocked = backlog.filter((item) => item.state === "permission-required");
const pending = backlog.filter((item) => !["source-vetted", "permission-required"].includes(item.state));

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(here, script), ...args], {
    cwd: frontendRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  let payload = null;
  try { payload = JSON.parse(output); } catch { payload = { raw: output }; }
  return { ok: result.status === 0, status: result.status, payload };
}

const results = [];
for (const item of eligible) {
  const args = [`--partner=${item.id}`];
  if (write) args.push("--write=true");
  const acquired = run("partner-logo-acquire.mjs", args);
  const record = { id: item.id, category: item.category, acquired };

  if (write && acquired.ok) {
    record.catalogue = run("partner-logo-catalogue-sync.mjs", [`--partner=${item.id}`, "--write=true"]);
    if (finalize && record.catalogue.ok) {
      record.finalized = run("partner-logo-finalize.mjs", [`--partner=${item.id}`, "--write=true"]);
    }
  }
  results.push(record);
}

const failed = results.filter((item) => !item.acquired.ok || (write && item.catalogue && !item.catalogue.ok) || (finalize && item.finalized && !item.finalized.ok));
const summary = {
  ok: failed.length === 0,
  mode: write ? (finalize ? "write-and-finalize" : "write") : "preview",
  eligible: eligible.length,
  permissionBlocked: blocked.length,
  pendingReview: pending.length,
  processed: results.length,
  failed: failed.length,
};

console.log(JSON.stringify({
  summary,
  results,
  permissionBlocked: blocked.map(({ id, category, sourceType }) => ({ id, category, sourceType })),
  pendingReview: pending.map(({ id, category, state, sourceType }) => ({ id, category, state, sourceType })),
}, null, 2));

if (failed.length) process.exitCode = 3;
