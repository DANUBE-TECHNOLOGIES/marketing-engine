"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

function sanitizeSegment(value, fallback = "asset") {
  const normalized = String(value || fallback)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

function assertSafeStorageKey(storageKey) {
  const value = String(storageKey || "");

  if (
    !value ||
    value.includes("..") ||
    path.isAbsolute(value) ||
    value.includes("\\")
  ) {
    throw new Error("Clé de stockage média invalide.");
  }

  return value;
}

class LocalAssetMediaStorage {
  constructor({
    rootDirectory,
    publicBasePath = "/media/assets",
  } = {}) {
    this.rootDirectory = path.resolve(
      rootDirectory ||
      process.env.ASSET_MEDIA_STORAGE_ROOT ||
      path.join(
        process.cwd(),
        "storage",
        "asset-media"
      )
    );

    this.publicBasePath = String(
      publicBasePath ||
      process.env.ASSET_MEDIA_PUBLIC_BASE_PATH ||
      "/media/assets"
    ).replace(/\/+$/, "");
  }

  async ensureRoot() {
    await fs.mkdir(
      this.rootDirectory,
      { recursive: true }
    );
  }

  buildStorageKey({
    tenantId,
    usage = "media",
    extension = "bin",
  }) {
    const date = new Date();

    const year = String(
      date.getUTCFullYear()
    );

    const month = String(
      date.getUTCMonth() + 1
    ).padStart(2, "0");

    return [
      sanitizeSegment(
        tenantId,
        "tenant"
      ),
      sanitizeSegment(
        usage,
        "media"
      ),
      year,
      month,
      `${crypto.randomUUID()}.${sanitizeSegment(
        extension,
        "bin"
      )}`,
    ].join("/");
  }

  resolvePath(storageKey) {
    const safeKey =
      assertSafeStorageKey(storageKey);

    const absolute =
      path.resolve(
        this.rootDirectory,
        safeKey
      );

    if (
      absolute !== this.rootDirectory &&
      !absolute.startsWith(
        `${this.rootDirectory}${path.sep}`
      )
    ) {
      throw new Error(
        "La clé média sort du dossier de stockage."
      );
    }

    return absolute;
  }

  publicUrl(storageKey) {
    const safeKey =
      assertSafeStorageKey(storageKey);

    return `${this.publicBasePath}/${safeKey
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`;
  }

  async write({
    storageKey,
    buffer,
  }) {
    await this.ensureRoot();

    const absolutePath =
      this.resolvePath(storageKey);

    await fs.mkdir(
      path.dirname(absolutePath),
      { recursive: true }
    );

    const temporaryPath =
      `${absolutePath}.tmp-${process.pid}-${Date.now()}`;

    await fs.writeFile(
      temporaryPath,
      buffer,
      { flag: "wx" }
    );

    await fs.rename(
      temporaryPath,
      absolutePath
    );

    return {
      storageKey,
      absolutePath,
      publicUrl:
        this.publicUrl(storageKey),
    };
  }
}

module.exports = {
  LocalAssetMediaStorage,
  sanitizeSegment,
  assertSafeStorageKey,
};
