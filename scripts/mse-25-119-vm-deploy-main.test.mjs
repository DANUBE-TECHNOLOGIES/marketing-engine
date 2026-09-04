import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const deployScript = fs.readFileSync(path.join(here, "mse-25-91-vm-deploy.sh"), "utf8");
const cleanupScript = fs.readFileSync(path.join(here, "mse-25-91-post-validation-cleanup.sh"), "utf8");

test("MSE-25.119 deploys canonical main by default", () => {
  assert.match(deployScript, /EXPECTED_BRANCH="\$\{MSE_25_91_EXPECTED_BRANCH:-main\}"/);
  assert.doesNotMatch(
    deployScript,
    /EXPECTED_BRANCH="integration\/mse-25-91-canonical-public-reconvergence-20260829"/,
  );
});

test("MSE-25.119 keeps explicit maintenance override and guarded fast-forward", () => {
  assert.match(deployScript, /MSE_25_91_EXPECTED_BRANCH/);
  assert.match(deployScript, /CURRENT_BRANCH="\$\(git branch --show-current\)"/);
  assert.match(deployScript, /git fetch "\$REMOTE" "\$EXPECTED_BRANCH"/);
  assert.match(deployScript, /git merge-base --is-ancestor HEAD "\$REMOTE_HEAD"/);
  assert.match(deployScript, /git merge --ff-only "\$REMOTE_HEAD"/);
});

test("MSE-25.119 preserves manual ACK, clean worktree and no migration write path", () => {
  assert.match(deployScript, /MSE_25_91_DEPLOY_ACK/);
  assert.match(deployScript, /git status --porcelain/);
  assert.match(deployScript, /starting backend from canonical repository without migrations or database writes/);
  assert.doesNotMatch(deployScript, /prisma migrate deploy/);
});

test("MSE-25.120 cleanup targets canonical main by default", () => {
  assert.match(cleanupScript, /EXPECTED_BRANCH="\$\{MSE_25_91_EXPECTED_BRANCH:-main\}"/);
  assert.doesNotMatch(
    cleanupScript,
    /EXPECTED_BRANCH="integration\/mse-25-91-canonical-public-reconvergence-20260829"/,
  );
  assert.match(cleanupScript, /MSE_25_91_VISUAL_ACK/);
  assert.match(cleanupScript, /git status --porcelain/);
  assert.match(cleanupScript, /frontend is not healthy/);
  assert.match(cleanupScript, /backend is not healthy/);
});
