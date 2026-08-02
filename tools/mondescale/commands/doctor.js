"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    timeout: options.timeout || 15000,
    cwd: options.cwd,
  });
}

function commandCheck(command, args = ["--version"]) {
  const result = run(command, args);
  return {
    ok: result.status === 0,
    message:
      (result.stdout || result.stderr || "")
        .trim()
        .split(/\r?\n/)[0] || "indisponible",
  };
}

function diskCheck(root) {
  const result = run("df", ["-Pk", root]);

  if (result.status !== 0) {
    return { ok: false, message: "lecture impossible" };
  }

  const columns = result.stdout.trim().split(/\r?\n/).at(-1).split(/\s+/);
  const availableGb = Number(columns[3] || 0) / 1024 / 1024;

  return {
    ok: availableGb >= 2,
    message: `${availableGb.toFixed(1)} Go disponibles`,
  };
}

async function doctor({ root, logger }) {
  const checks = [];

  function add(name, result, required = true) {
    checks.push({ name, required, ...result });
  }

  add("Node.js", commandCheck("node"));
  add("Git", commandCheck("git"));
  add("Docker", commandCheck("docker"));
  add(
    "Docker Compose",
    commandCheck("docker", ["compose", "version"])
  );

  for (const marker of ["backend", "frontend", ".git"]) {
    const exists = fs.existsSync(path.join(root, marker));
    add(
      marker,
      {
        ok: exists,
        message: exists ? "détecté" : "absent",
      },
      marker !== "frontend"
    );
  }

  add("Espace disque", diskCheck(root));

  const freeGb = os.freemem() / 1024 / 1024 / 1024;
  add(
    "Mémoire",
    {
      ok: freeGb >= 0.5,
      message: `${freeGb.toFixed(1)} Go libres`,
    },
    false
  );

  const compose = run(
    "docker",
    ["compose", "config", "--services"],
    { cwd: root, timeout: 30000 }
  );

  add("Configuration Compose", {
    ok: compose.status === 0,
    message:
      compose.status === 0
        ? compose.stdout.trim().split(/\r?\n/).join(", ")
        : (compose.stderr || "").trim(),
  });

  console.log("\nMondescale Doctor");
  console.log("=================");

  for (const check of checks) {
    const symbol = check.ok ? "✓" : check.required ? "✗" : "!";
    console.log(`${symbol} ${check.name} — ${check.message}`);

    if (check.ok) logger.success(check.name, check);
    else if (check.required) logger.error(check.name, check);
    else logger.warn(check.name, check);
  }

  const failures = checks.filter(
    (check) => check.required && !check.ok
  );

  console.log(`\nJournal : ${logger.file}`);

  if (failures.length) {
    throw new Error(
      `${failures.length} contrôle(s) obligatoire(s) en échec.`
    );
  }

  console.log("✓ Environnement prêt.");
}

module.exports = doctor;
