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

function databaseHost(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    return new URL(databaseUrl).hostname;
  } catch (_) {
    return null;
  }
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

    // Host-side scripts must keep the backend runtime DATABASE_URL ahead of
    // the repository-root Docker DATABASE_URL. The root file remains only a
    // fallback for missing Google credentials.
    if (loadEnvFile(resolved)) loaded.push(resolved);
    if (rootCandidate && loadEnvFile(rootCandidate)) loaded.push(rootCandidate);
  }

  // Shell sessions may already contain the Docker DATABASE_URL before dotenv
  // runs, in which case override:false correctly refuses to replace it. MSE-25.48
  // therefore supports an explicit host-side database URL for CLI/read-only
  // jobs. It is intentionally scoped to MSE-25.48 and never rewrites .env files.
  if (process.env.MSE_25_48_HOST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.MSE_25_48_HOST_DATABASE_URL;
  }

  return {
    loadedFiles: loaded,
    databaseHost: databaseHost(process.env.DATABASE_URL),
    hostDatabaseOverrideApplied: Boolean(process.env.MSE_25_48_HOST_DATABASE_URL),
    googleClientConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    googleRedirectUriConfigured: Boolean(process.env.GOOGLE_REDIRECT_URI),
  };
}

module.exports = { bootstrapMse2548Env, loadEnvFile, databaseHost };
