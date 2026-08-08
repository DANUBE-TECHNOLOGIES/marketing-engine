import { BlockSdkError } from "./errors.mjs";

import {
  createBlockFromManifest,
  validateManifest,
} from "./manifest.mjs";

export class BlockRegistryV3 {
  constructor(manifests = []) {
    this.manifests = new Map();

    for (const manifest of manifests) {
      this.register(manifest);
    }
  }

  register(input) {
    const manifest = validateManifest(input);

    if (this.manifests.has(manifest.type)) {
      throw new BlockSdkError(
        `Le bloc ${manifest.type} est déjà enregistré.`,
        "DUPLICATE_BLOCK_MANIFEST",
        { type: manifest.type }
      );
    }

    this.manifests.set(
      manifest.type,
      manifest
    );

    return this;
  }

  unregister(type) {
    return this.manifests.delete(
      String(type || "").toLowerCase()
    );
  }

  has(type) {
    return this.manifests.has(
      String(type || "").toLowerCase()
    );
  }

  get(type) {
    const normalized = String(type || "")
      .trim()
      .toLowerCase();

    const manifest =
      this.manifests.get(normalized);

    if (!manifest) {
      throw new BlockSdkError(
        `Bloc inconnu : ${normalized || "(vide)"}.`,
        "UNKNOWN_BLOCK_MANIFEST",
        { type: normalized }
      );
    }

    return manifest;
  }

  list(options = {}) {
    const category = options.category
      ? String(options.category).toLowerCase()
      : null;

    return [...this.manifests.values()]
      .filter(
        (manifest) =>
          !category ||
          manifest.category === category
      )
      .sort((left, right) =>
        left.label.localeCompare(
          right.label,
          "fr"
        )
      );
  }

  categories() {
    return [
      ...new Set(
        this.list().map(
          (manifest) => manifest.category
        )
      ),
    ].sort();
  }

  create(type, overrides = {}) {
    return createBlockFromManifest(
      this.get(type),
      overrides
    );
  }

  health() {
    return {
      status: "ok",
      capability: "block-sdk-v3",
      manifests: this.manifests.size,
      categories: this.categories(),
      types: this.list().map(
        (manifest) => manifest.type
      ),
    };
  }
}
