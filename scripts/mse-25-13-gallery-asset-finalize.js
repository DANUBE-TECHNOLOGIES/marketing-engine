"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const branch = "feature/mse-25-13-local-content-differentiation";

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function write(file, content) {
  fs.writeFileSync(path.join(root, file), content);
}

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: motif attendu 1 fois, trouvé ${count}.`);
  }
  return source.replace(before, after);
}

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function patchGalleryEditor() {
  const file = "frontend/components/page-builder-v2/BlockListEditors.js";
  let source = read(file);

  source = replaceOnce(
    source,
    `export function GalleryEditor({\n  images,\n  onChange,\n}) {`,
    `export function GalleryEditor({\n  images,\n  onChange,\n  assets = [],\n  loading = false,\n}) {`,
    "GalleryEditor props"
  );

  source = replaceOnce(
    source,
    `      createItem={() => ({\n        url: "",\n        alt: "",\n        caption: "",\n      })}`,
    `      createItem={() => ({\n        imageAssetId: "",\n        url: "",\n        alt: "",\n        caption: "",\n      })}`,
    "GalleryEditor create item"
  );

  const oldBody = `      {({ item, update }) => (\n        <>\n          {item.url ? (\n            // eslint-disable-next-line @next/next/no-img-element\n            <img\n              className={styles.editorThumbnail}\n              src={item.url}\n              alt={item.alt || ""}\n            />\n          ) : null}\n\n          <Field\n            label="URL de l’image"\n            value={item.url}\n            onChange={(url) =>\n              update({\n                ...item,\n                url,\n              })\n            }\n          />\n\n          <Field\n            label="Texte alternatif"\n            value={item.alt}\n            onChange={(alt) =>\n              update({\n                ...item,\n                alt,\n              })\n            }\n          />\n\n          <Field\n            label="Légende"\n            value={item.caption}\n            multiline\n            onChange={(caption) =>\n              update({\n                ...item,\n                caption,\n              })\n            }\n          />\n        </>\n      )}`;

  const newBody = `      {({ item, update }) => {\n        const selectedAsset =\n          item.imageAssetId\n            ? assets.find((asset) => asset.id === item.imageAssetId) || null\n            : null;\n\n        const previewUrl = item.url || selectedAsset?.url || "";\n\n        return (\n          <>\n            {previewUrl ? (\n              // eslint-disable-next-line @next/next/no-img-element\n              <img\n                className={styles.editorThumbnail}\n                src={previewUrl}\n                alt={item.alt || ""}\n              />\n            ) : null}\n\n            <MediaPicker\n              assets={assets}\n              loading={loading}\n              selectedAssetId={item.imageAssetId || ""}\n              onSelect={(asset) =>\n                update({\n                  ...item,\n                  imageAssetId: asset.id,\n                  url: null,\n                  alt: item.alt || asset.altText || "",\n                })\n              }\n              onClear={() =>\n                update({\n                  ...item,\n                  imageAssetId: "",\n                })\n              }\n            />\n\n            <details>\n              <summary>URL d’image héritée</summary>\n              <Field\n                label="URL de l’image"\n                value={item.url}\n                onChange={(url) =>\n                  update({\n                    ...item,\n                    url,\n                  })\n                }\n              />\n            </details>\n\n            <Field\n              label="Texte alternatif"\n              value={item.alt}\n              onChange={(alt) =>\n                update({\n                  ...item,\n                  alt,\n                })\n              }\n            />\n\n            <Field\n              label="Légende"\n              value={item.caption}\n              multiline\n              onChange={(caption) =>\n                update({\n                  ...item,\n                  caption,\n                })\n              }\n            />\n          </>\n        );\n      }}`;

  source = replaceOnce(source, oldBody, newBody, "GalleryEditor body");
  write(file, source);
}

function patchVisualBuilder() {
  const file = "frontend/components/page-builder-v2/VisualPageBuilder.js";
  let source = read(file);

  const oldPreview = `            {(content.images || []).length ? (\n              content.images.map((image, index) => (\n                // eslint-disable-next-line @next/next/no-img-element\n                <img\n                  key={\`${"${image.url}"}-${"${index}"}\`}\n                  src={image.url}\n                  alt={image.alt || ""}\n                />\n              ))\n            ) : (`;

  const newPreview = `            {(content.images || []).length ? (\n              content.images.map((image, index) => {\n                const asset = image.imageAssetId\n                  ? mediaAssetsById[image.imageAssetId] || null\n                  : null;\n                const imageUrl = image.url || asset?.url || "";\n\n                return imageUrl ? (\n                  // eslint-disable-next-line @next/next/no-img-element\n                  <img\n                    key={image.id || image.imageAssetId || image.url || index}\n                    src={imageUrl}\n                    alt={image.alt || ""}\n                  />\n                ) : null;\n              })\n            ) : (`;

  source = replaceOnce(source, oldPreview, newPreview, "Gallery preview");

  source = replaceOnce(
    source,
    `        <GalleryEditor\n          images={content.images}\n          onChange={(images) => set("images", images)}\n        />`,
    `        <GalleryEditor\n          images={content.images}\n          assets={mediaAssets}\n          loading={mediaLoading}\n          onChange={(images) => set("images", images)}\n        />`,
    "GalleryEditor props in builder"
  );

  write(file, source);
}

function patchRoutes() {
  const file = "backend/src/modules/public-site-read/routes.js";
  let source = read(file);

  if (!source.includes('require("./gallery-media-hydrator")')) {
    source = replaceOnce(
      source,
      `const {\n  hydrateImageTextMediaAssets,\n} = require("./image-text-media-hydrator");\n`,
      `const {\n  hydrateImageTextMediaAssets,\n} = require("./image-text-media-hydrator");\nconst {\n  hydrateGalleryMediaAssets,\n} = require("./gallery-media-hydrator");\n`,
      "gallery hydrator import"
    );
  }

  if (!source.includes("const galleryMediaPages =")) {
    source = replaceOnce(
      source,
      `  const imageTextMediaPages =\n    await hydrateImageTextMediaAssets({\n      prisma: database,\n      tenantId,\n      pages: teamMediaPages,\n    });\n\n  const pages = await filterAgencyInspirations({\n    database,\n    tenantId,\n    agencyId,\n    pages: imageTextMediaPages,\n  });`,
      `  const imageTextMediaPages =\n    await hydrateImageTextMediaAssets({\n      prisma: database,\n      tenantId,\n      pages: teamMediaPages,\n    });\n\n  const galleryMediaPages =\n    await hydrateGalleryMediaAssets({\n      prisma: database,\n      tenantId,\n      pages: imageTextMediaPages,\n    });\n\n  const pages = await filterAgencyInspirations({\n    database,\n    tenantId,\n    agencyId,\n    pages: galleryMediaPages,\n  });`,
      "gallery hydration pipeline"
    );
  }

  source = source.replace('version: "1.8"', 'version: "1.9"');
  write(file, source);
}

function appendRegistryTest() {
  const file = "backend/test/page-builder-registry.test.js";
  let source = read(file);
  if (source.includes("gallery conserve imageAssetId Asset Engine")) return;

  source += `\n\ntest("gallery conserve imageAssetId Asset Engine", () => {\n  const registry = new BlockRegistry();\n  const assetId = "asset-gallery-regression-test";\n  const blocks = registry.validatePage([{\n    id: "gallery-asset-test",\n    type: "gallery",\n    status: "draft",\n    position: 0,\n    content: {\n      title: "Galerie locale",\n      images: [{\n        imageAssetId: assetId,\n        url: null,\n        alt: "Photo locale",\n        caption: "Notre agence",\n      }],\n      columns: 3,\n    },\n    settings: {},\n  }]);\n  assert.equal(blocks[0].content.images[0].imageAssetId, assetId);\n  assert.equal(blocks[0].content.images[0].url, null);\n});\n`;

  write(file, source);
}

function main() {
  const currentBranch = execFileSync("git", ["branch", "--show-current"], {
    cwd: root,
    encoding: "utf8",
  }).trim();

  if (currentBranch !== branch) {
    throw new Error(`Branche inattendue: ${currentBranch}`);
  }

  const status = execFileSync("git", ["status", "--short"], {
    cwd: root,
    encoding: "utf8",
  }).trim();

  if (status) {
    throw new Error(`Working tree non propre avant finalisation:\n${status}`);
  }

  patchGalleryEditor();
  patchVisualBuilder();
  patchRoutes();
  appendRegistryTest();

  run("node", ["--check", "backend/src/modules/public-site-read/routes.js"]);
  run("node", ["--check", "backend/src/modules/public-site-read/gallery-media-hydrator.js"]);
  run("node", ["--test", "backend/test/page-builder-registry.test.js"]);

  run("git", ["add",
    "frontend/components/page-builder-v2/BlockListEditors.js",
    "frontend/components/page-builder-v2/VisualPageBuilder.js",
    "backend/src/modules/public-site-read/routes.js",
    "backend/test/page-builder-registry.test.js",
  ]);

  run("git", ["commit", "-m", "feat(designer): connect galleries to Asset Engine media"]);
  run("git", ["push", "origin", branch]);

  console.log("MSE-25.13 Gallery Asset Engine finalisé et poussé.");
}

main();
