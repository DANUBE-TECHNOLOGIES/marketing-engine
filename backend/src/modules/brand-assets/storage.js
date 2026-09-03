"use strict";

const crypto =
  require("node:crypto");

const fs =
  require("node:fs/promises");

const path =
  require("node:path");

const {
  brandAssetError,
} = require("./errors");

function sanitizeSegment(
  value,
  fallback = "global"
) {
  const normalized =
    String(
      value || fallback
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      );

  return (
    normalized ||
    fallback
  );
}

function assertSafeStorageKey(
  storageKey
) {
  const value =
    String(
      storageKey || ""
    );

  if (
    !value ||
    value.includes("..") ||
    path.isAbsolute(value) ||
    value.includes("\\")
  ) {
    throw brandAssetError(
      "BRAND_ASSET_INVALID_STORAGE_KEY",
      "La clé de stockage est invalide."
    );
  }

  return value;
}

class LocalBrandAssetStorage {
  constructor({
    rootDirectory,
    publicBasePath =
      "/media/brand-assets",
  } = {}) {
    this.rootDirectory =
      path.resolve(
        rootDirectory ||
        process.env
          .BRAND_ASSET_STORAGE_ROOT ||
        path.join(
          process.cwd(),
          "storage",
          "brand-assets"
        )
      );

    this.publicBasePath =
      String(
        publicBasePath ||
        "/media/brand-assets"
      ).replace(
        /\/+$/,
        ""
      );
  }

  async ensureRoot() {
    await fs.mkdir(
      this.rootDirectory,
      {
        recursive:
          true,
      }
    );
  }

  buildStorageKey({
    tenantId,
    agencyId,
    kind,
    extension,
  }) {
    const tenant =
      sanitizeSegment(
        tenantId,
        "tenant"
      );

    const scope =
      agencyId ===
        null ||
      agencyId ===
        undefined
        ? "shared"
        : `agency-${sanitizeSegment(
            agencyId,
            "unknown"
          )}`;

    const assetKind =
      sanitizeSegment(
        kind,
        "asset"
      );

    const date =
      new Date();

    const year =
      String(
        date.getUTCFullYear()
      );

    const month =
      String(
        date.getUTCMonth() +
        1
      ).padStart(
        2,
        "0"
      );

    const id =
      crypto.randomUUID();

    const safeExtension =
      sanitizeSegment(
        extension,
        "bin"
      );

    return [
      tenant,
      scope,
      assetKind,
      year,
      month,
      `${id}.${safeExtension}`,
    ].join("/");
  }

  resolvePath(
    storageKey
  ) {
    const safeKey =
      assertSafeStorageKey(
        storageKey
      );

    const absolute =
      path.resolve(
        this.rootDirectory,
        safeKey
      );

    if (
      absolute !==
        this.rootDirectory &&
      !absolute.startsWith(
        `${this.rootDirectory}${path.sep}`
      )
    ) {
      throw brandAssetError(
        "BRAND_ASSET_STORAGE_ESCAPE",
        "La clé tente de sortir du dossier de stockage."
      );
    }

    return absolute;
  }

  publicUrl(
    storageKey
  ) {
    const safeKey =
      assertSafeStorageKey(
        storageKey
      );

    return `${this.publicBasePath}/${safeKey
      .split("/")
      .map(
        encodeURIComponent
      )
      .join("/")}`;
  }

  async write({
    storageKey,
    buffer,
  }) {
    await this.ensureRoot();

    const absolutePath =
      this.resolvePath(
        storageKey
      );

    await fs.mkdir(
      path.dirname(
        absolutePath
      ),
      {
        recursive:
          true,
      }
    );

    const temporaryPath =
      `${absolutePath}.tmp-${process.pid}-${Date.now()}`;

    await fs.writeFile(
      temporaryPath,
      buffer,
      {
        flag:
          "wx",
      }
    );

    await fs.rename(
      temporaryPath,
      absolutePath
    );

    return {
      storageKey,
      absolutePath,
      publicUrl:
        this.publicUrl(
          storageKey
        ),
    };
  }

  async remove(
    storageKey
  ) {
    const absolutePath =
      this.resolvePath(
        storageKey
      );

    try {
      await fs.unlink(
        absolutePath
      );

      return true;
    } catch (error) {
      if (
        error?.code ===
        "ENOENT"
      ) {
        return false;
      }

      throw error;
    }
  }

  async exists(
    storageKey
  ) {
    const absolutePath =
      this.resolvePath(
        storageKey
      );

    try {
      await fs.access(
        absolutePath
      );

      return true;
    } catch {
      return false;
    }
  }
}

module.exports = {
  LocalBrandAssetStorage,
  sanitizeSegment,
  assertSafeStorageKey,
};
