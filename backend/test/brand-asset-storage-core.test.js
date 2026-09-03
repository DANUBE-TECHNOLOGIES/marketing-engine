"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const fs =
  require("node:fs/promises");

const os =
  require("node:os");

const path =
  require("node:path");

const {
  LocalBrandAssetStorage,
  detectMimeType,
  validateFileSignature,
  extractImageDimensions,
  sanitizeSegment,
  assertSafeStorageKey,
} = require(
  "../src/modules/brand-assets"
);

const PNG_1X1 =
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );

test(
  "détecte un PNG réel",
  () => {
    assert.equal(
      detectMimeType(
        PNG_1X1
      ),
      "image/png"
    );
  }
);

test(
  "détecte les dimensions PNG",
  () => {
    assert.deepEqual(
      extractImageDimensions(
        PNG_1X1,
        "image/png"
      ),
      {
        width:
          1,

        height:
          1,
      }
    );
  }
);

test(
  "refuse un faux PNG",
  () => {
    assert.throws(
      () =>
        validateFileSignature({
          buffer:
            Buffer.from(
              "ceci n'est pas une image"
            ),

          declaredMimeType:
            "image/png",
        }),
      (error) => {
        assert.equal(
          error.code,
          "BRAND_ASSET_UNSUPPORTED_FILE"
        );

        return true;
      }
    );
  }
);

test(
  "refuse une incohérence MIME",
  () => {
    assert.throws(
      () =>
        validateFileSignature({
          buffer:
            PNG_1X1,

          declaredMimeType:
            "application/pdf",
        }),
      (error) => {
        assert.equal(
          error.code,
          "BRAND_ASSET_MIME_MISMATCH"
        );

        return true;
      }
    );
  }
);

test(
  "génère une clé sûre",
  () => {
    const storage =
      new LocalBrandAssetStorage({
        rootDirectory:
          "/tmp/brand-assets-test",
      });

    const key =
      storage.buildStorageKey({
        tenantId:
          "tenant mondescale",

        agencyId:
          6,

        kind:
          "logo-primary",

        extension:
          "png",
      });

    assert.match(
      key,
      /^tenant-mondescale\/agency-6\/logo-primary\/\d{4}\/\d{2}\/[a-f0-9-]+\.png$/
    );
  }
);

test(
  "écrit puis supprime un fichier",
  async () => {
    const root =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          "brand-assets-"
        )
      );

    const storage =
      new LocalBrandAssetStorage({
        rootDirectory:
          root,

        publicBasePath:
          "/media/test",
      });

    const key =
      storage.buildStorageKey({
        tenantId:
          "tenant",

        agencyId:
          null,

        kind:
          "logo-primary",

        extension:
          "png",
      });

    const result =
      await storage.write({
        storageKey:
          key,

        buffer:
          PNG_1X1,
      });

    assert.equal(
      await storage.exists(
        key
      ),
      true
    );

    assert.match(
      result.publicUrl,
      /^\/media\/test\//
    );

    assert.equal(
      await storage.remove(
        key
      ),
      true
    );

    assert.equal(
      await storage.exists(
        key
      ),
      false
    );
  }
);

test(
  "interdit les sorties de dossier",
  () => {
    assert.throws(
      () =>
        assertSafeStorageKey(
          "../../etc/passwd"
        ),
      (error) => {
        assert.equal(
          error.code,
          "BRAND_ASSET_INVALID_STORAGE_KEY"
        );

        return true;
      }
    );
  }
);

test(
  "normalise les segments",
  () => {
    assert.equal(
      sanitizeSegment(
        "Logo Principal FRAM"
      ),
      "logo-principal-fram"
    );
  }
);
