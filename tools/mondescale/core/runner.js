"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function runCommand({ root, logger, command, args = [], env = {}, allowFailure = false }) {
  logger.info(`Exécution : ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  const ok = result.status === 0;
  if (!ok && !allowFailure) {
    const error = new Error(`Commande en échec (${result.status}) : ${command} ${args.join(" ")}`);
    error.exitCode = result.status;
    throw error;
  }

  return { ok, status: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
}

function ensureExecutable(file) {
  const stat = fs.statSync(file);
  if ((stat.mode & 0o111) === 0) fs.chmodSync(file, stat.mode | 0o755);
}

function executePatchScript({ root, patchDirectory, logger }) {
  const script = path.join(patchDirectory, "patch.sh");
  if (!fs.existsSync(script)) throw new Error(`Script patch.sh absent dans ${patchDirectory}`);
  ensureExecutable(script);
  return runCommand({
    root,
    logger,
    command: script,
    args: [root],
    env: { MONDESCALE_PATCH_ROOT: patchDirectory },
  });
}

module.exports = { runCommand, executePatchScript };
