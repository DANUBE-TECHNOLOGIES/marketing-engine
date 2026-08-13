"use strict";

const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: motif attendu 1 fois, trouvé ${count}.`);
  }
  return source.replace(before, after);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
}

function patchVisualPageBuilder() {
  const file = "frontend/components/page-builder-v2/VisualPageBuilder.js";
  let source = read(file);

  source = replaceOnce(
    source,
    '        block.type === "hero" ? (',
    '        ["hero", "image_text"].includes(block.type) ? (',
    "VisualPageBuilder MediaPicker block types"
  );

  source = replaceOnce(
    source,
    "                  imageAssetId: asset.id,\n                  imageAlt:",
    "                  imageAssetId: asset.id,\n                  imageUrl: null,\n                  imageAlt:",
    "VisualPageBuilder media selection"
  );

  write(file, source);
  console.log("OK: Image + texte utilise maintenant le Media Picker Asset Engine.");
}

function patchPublicPipeline() {
  const file = "backend/src/modules/public-site-read/routes.js";
  let source = read(file);

  if (!source.includes('require("./image-text-media-hydrator")')) {
    source = replaceOnce(
      source,
      'const {\n  hydrateTeamMediaAssets,\n} = require("./team-media-hydrator");\n',
      'const {\n  hydrateTeamMediaAssets,\n} = require("./team-media-hydrator");\nconst {\n  hydrateImageTextMediaAssets,\n} = require("./image-text-media-hydrator");\n',
      "public-site image-text hydrator import"
    );
  }

  if (!source.includes("const imageTextMediaPages =")) {
    source = replaceOnce(
      source,
      '  const teamMediaPages =\n    await hydrateTeamMediaAssets({\n      prisma: database,\n      tenantId,\n      pages: destinationMediaPages,\n    });\n\n  const pages = await filterAgencyInspirations({\n    database,\n    tenantId,\n    agencyId,\n    pages: teamMediaPages,\n  });',
      '  const teamMediaPages =\n    await hydrateTeamMediaAssets({\n      prisma: database,\n      tenantId,\n      pages: destinationMediaPages,\n    });\n\n  const imageTextMediaPages =\n    await hydrateImageTextMediaAssets({\n      prisma: database,\n      tenantId,\n      pages: teamMediaPages,\n    });\n\n  const pages = await filterAgencyInspirations({\n    database,\n    tenantId,\n    agencyId,\n    pages: imageTextMediaPages,\n  });',
      "public-site image-text hydration pipeline"
    );
  }

  source = source.replace('version: "1.7"', 'version: "1.8"');

  write(file, source);
  console.log("OK: Image + texte hydraté par Asset Engine dans le contrat public.");
}

function main() {
  const branch = execFileSync("git", ["branch", "--show-current"], {
    cwd: root,
    encoding: "utf8",
  }).trim();

  if (branch !== "feature/mse-25-13-local-content-differentiation") {
    throw new Error(`Branche inattendue: ${branch}`);
  }

  const beforeStatus = execFileSync("git", ["status", "--short"], {
    cwd: root,
    encoding: "utf8",
  }).trim();

  if (beforeStatus) {
    const allowed = beforeStatus
      .split("\n")
      .filter(Boolean)
      .every((line) =>
        line.endsWith("frontend/components/public-site/premium-sections.css")
      );

    if (!allowed) {
      throw new Error(
        `Working tree contient des modifications inattendues avant patch:\n${beforeStatus}`
      );
    }
  }

  patchVisualPageBuilder();
  patchPublicPipeline();

  run("node", ["--check", "backend/src/modules/public-site-read/routes.js"]);
  run("node", ["--check", "backend/src/modules/public-site-read/image-text-media-hydrator.js"]);
  run("node", ["--test",
    "backend/test/page-builder-registry.test.js",
    "backend/test/image-text-media-hydrator.test.js",
  ]);

  run("git", ["add",
    "frontend/components/page-builder-v2/VisualPageBuilder.js",
    "frontend/components/public-site/premium-sections.css",
    "backend/src/modules/public-site-read/routes.js",
  ]);

  run("git", ["commit", "-m", "feat(designer): connect image-text blocks to Asset Engine media"]);
  run("git", ["push", "origin", branch]);

  console.log("MSE-25.13 image-text Asset Engine finalisé et poussé.");
}

main();
