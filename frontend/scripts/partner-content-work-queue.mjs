import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const readinessScript = path.join(here, "partner-publication-readiness.mjs");

const result = spawnSync(process.execPath, [readinessScript], {
  encoding: "utf8",
  cwd: path.resolve(here, ".."),
});

if (result.error) throw result.error;
if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "Unable to compute partner readiness.\n");
  process.exit(result.status || 1);
}

const readiness = JSON.parse(result.stdout);
const priority = {
  "identity-review": 0,
  summary: 1,
  tags: 2,
  destinations: 3,
  "travel-types": 4,
};

const queue = readiness.backlog
  .filter((row) => row.verificationStatus !== "identity-review")
  .map((row) => ({
    ...row,
    nextAction: [...row.blockers].sort((a, b) => (priority[a] ?? 99) - (priority[b] ?? 99))[0] || "review",
  }))
  .sort((a, b) => a.score - b.score || (priority[a.nextAction] ?? 99) - (priority[b.nextAction] ?? 99) || a.name.localeCompare(b.name));

const heldForIdentityReview = readiness.backlog
  .filter((row) => row.verificationStatus === "identity-review")
  .map((row) => ({ ...row, nextAction: "confirm-identity" }));

console.log(JSON.stringify({
  policy: "fix-confirmed-content-before-assets",
  summary: {
    actionable: queue.length,
    heldForIdentityReview: heldForIdentityReview.length,
    ready: readiness.summary.ready,
    readyWithLogoFallback: readiness.summary.readyWithLogoFallback,
  },
  queue,
  heldForIdentityReview,
}, null, 2));
