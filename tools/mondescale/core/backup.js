"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

function stamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-");
}

function copyPath(source, destination) {
  fs.mkdirSync(path.dirname(destination), {
    recursive: true,
  });

  fs.cpSync(source, destination, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
  });
}

function run(root, command, args, outputFile = null) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: outputFile ? null : "utf8",
    stdio: outputFile
      ? ["ignore", "pipe", "pipe"]
      : ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    const stderr = result.stderr
      ? result.stderr.toString()
      : "";

    throw new Error(
      `${command} ${args.join(" ")} a échoué : ${stderr.trim()}`
    );
  }

  if (outputFile) {
    fs.writeFileSync(outputFile, result.stdout);
  }

  return result;
}

function createBackup({
  root,
  patchId = "manual",
  files = [],
  includeGit = true,
  includeCompose = true,
  includeEnv = true,
  includeDatabase = false,
  logger,
}) {
  const directory = path.join(
    root,
    "backups",
    `${patchId}-${stamp()}`
  );

  fs.mkdirSync(directory, {
    recursive: true,
  });

  const copied = [];

  for (const relativePath of files) {
    const source = path.join(root, relativePath);

    if (!fs.existsSync(source)) {
      logger?.warn(
        `Sauvegarde ignorée, chemin absent : ${relativePath}`
      );
      continue;
    }

    const destination = path.join(
      directory,
      "files",
      relativePath
    );

    copyPath(source, destination);
    copied.push(relativePath);
  }

  if (includeEnv) {
    for (const file of [".env", ".env.local", "backend/.env", "frontend/.env.local"]) {
      const source = path.join(root, file);
      if (fs.existsSync(source)) {
        copyPath(
          source,
          path.join(directory, "config", file)
        );
        copied.push(file);
      }
    }
  }

  if (includeCompose) {
    for (const file of ["docker-compose.yml", "compose.yml", "compose.yaml"]) {
      const source = path.join(root, file);
      if (fs.existsSync(source)) {
        copyPath(
          source,
          path.join(directory, "config", file)
        );
        copied.push(file);
      }
    }
  }

  if (includeGit && fs.existsSync(path.join(root, ".git"))) {
    const git = {};

    for (const [key, args] of Object.entries({
      head: ["rev-parse", "HEAD"],
      branch: ["branch", "--show-current"],
      status: ["status", "--short"],
    })) {
      const result = spawnSync("git", args, {
        cwd: root,
        encoding: "utf8",
      });

      git[key] = result.status === 0
        ? result.stdout.trim()
        : null;
    }

    fs.writeFileSync(
      path.join(directory, "git.json"),
      JSON.stringify(git, null, 2) + "\n"
    );
  }

  if (includeDatabase) {
    const databaseFile = path.join(
      directory,
      "database.sql"
    );

    const result = spawnSync(
      "docker",
      [
        "compose",
        "exec",
        "-T",
        "postgres",
        "sh",
        "-lc",
        'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
      ],
      {
        cwd: root,
        encoding: null,
      }
    );

    if (result.status !== 0) {
      throw new Error(
        `Sauvegarde PostgreSQL impossible : ${(result.stderr || Buffer.from("" )).toString().trim()}`
      );
    }

    fs.writeFileSync(databaseFile, result.stdout);
  }

  const manifest = {
    patchId,
    createdAt: new Date().toISOString(),
    directory,
    files: copied,
    includeGit,
    includeCompose,
    includeEnv,
    includeDatabase,
  };

  fs.writeFileSync(
    path.join(directory, "backup.json"),
    JSON.stringify(manifest, null, 2) + "\n"
  );

  logger?.success(`Sauvegarde créée : ${directory}`);

  return manifest;
}

module.exports = {
  createBackup,
};
