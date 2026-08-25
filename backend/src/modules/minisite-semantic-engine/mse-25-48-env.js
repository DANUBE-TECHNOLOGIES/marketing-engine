"use strict";

const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

function loadEnvFile(file) {
  if (!file) return false;
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) return false;
  dotenv.config({ path: resolved, quiet: true, override: false });
  return true;
}

function bootstrapMse2548Env() {
  const explicit = process.env.MSE_25_48_ENV_FILE || process.env.MSE_25_40_ENV_FILE;
  const loaded = [];

  if (explicit) {
    const resolved = path.resolve(explicit);
    const dir = path.dirname(resolved);
    const rootCandidate = path.basename(dir) === "backend"
      ? path.resolve(dir, "..", ".env")
      : null;

    // Host-side scripts must keep the backend runtime DATABASE_URL (typically
    // localhost/forwarded) ahead of the repository root Docker DATABASE_URL
    // (typically postgres:5432). Root .env is only a fallback for missing
    // credentials such as GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
    if (loadEnvFile(resolved)) loaded.push(resolved);
    if (rootCandidate && loadEnvFile(rootCandidate)) loaded.push(rootCandidate);
  }

  return {
    loadedFiles: loaded,
    googleClientConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    googleRedirectUriConfigured: Boolean(process.env.GOOGLE_REDIRECT_URI),
  };
}

module.exports = { bootstrapMse2548Env, loadEnvFile };
