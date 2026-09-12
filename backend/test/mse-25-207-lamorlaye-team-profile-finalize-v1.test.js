"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const script = fs.readFileSync(
  path.join(
    process.cwd(),
    "backend/scripts/mse-25-207-lamorlaye-team-profile-finalize-v1.js"
  ),
  "utf8"
);

test(
  "MSE-25.207 finalization targets exact Lamorlaye Team block",
  () => {
    assert.match(
      script,
      /cmsztn4f200gxtdhdqdqffwmj/
    );

    assert.match(
      script,
      /cms8n8meo00jzn91akxbd5c5i/
    );
  }
);

test(
  "MSE-25.207 finalization reads canonical Stephanie from exact Home block",
  () => {
    assert.match(
      script,
      /cmsztn4io00hntdhdomq7iobf/
    );

    assert.match(
      script,
      /cms8n8jen00j9n91a25i1tspp/
    );
  }
);

test(
  "MSE-25.207 finalization requires exact existing Stephanie asset",
  () => {
    assert.match(
      script,
      /cmsrqxgrr000kmn1a8d2q83va/
    );

    assert.match(
      script,
      /820a6b99-69be-4bf4-9d68-b34cd5959c32\.png/
    );
  }
);

test(
  "MSE-25.207 finalization preserves canonical identity and media",
  () => {
    assert.match(
      script,
      /member\.name !== "Stéphanie"/
    );

    assert.match(
      script,
      /member\.role !==\s*"Conseillère voyage"/
    );

    assert.match(
      script,
      /member\.imageAssetId !==\s*STEPHANIE_ASSET_ID/
    );
  }
);

test(
  "MSE-25.207 finalization removes only duplicate long presentation projection",
  () => {
    assert.match(
      script,
      /delete projected\.presentation/
    );

    assert.doesNotMatch(
      script,
      /delete projected\.description/
    );

    assert.doesNotMatch(
      script,
      /delete projected\.imageAssetId/
    );
  }
);

test(
  "MSE-25.207 finalization restores Team visibility",
  () => {
    assert.match(
      script,
      /visibleDesktop:\s*true/
    );

    assert.match(
      script,
      /visibleMobile:\s*true/
    );
  }
);

test(
  "MSE-25.207 finalization preserves Stephanie editorial",
  () => {
    assert.match(
      script,
      /STEPHANIE_EDITORIAL_ID/
    );

    assert.match(
      script,
      /Stephanie editorial changed/
    );

    assert.match(
      script,
      /editorialPreserved/
    );
  }
);

test(
  "MSE-25.207 finalization has an independent rollback snapshot",
  () => {
    assert.match(
      script,
      /mse-25-207-lamorlaye-team-profile-finalize-v1\.snapshot\.json/
    );

    assert.match(
      script,
      /--rollback/
    );
  }
);

test(
  "MSE-25.207 finalization is dry-run by default",
  () => {
    assert.match(
      script,
      /MSE_25_207_PROFILE_CONFIRM/
    );

    assert.match(
      script,
      /DRY_RUN/
    );
  }
);

test(
  "MSE-25.207 finalization mutates PageBlock only",
  () => {
    assert.match(
      script,
      /tx\.pageBlock\.update/
    );

    assert.doesNotMatch(
      script,
      /pageBlock\.create/
    );

    assert.doesNotMatch(
      script,
      /agencySitePage\.(?:update|create|delete)/
    );

    assert.doesNotMatch(
      script,
      /prisma\.(?:destination|agencySiteSection)\.(?:update|create|delete)/
    );
  }
);

test(
  "MSE-25.207 finalization protects source Home profile and unrelated Team blocks",
  () => {
    assert.match(
      script,
      /canonicalHomeTeam/
    );

    assert.match(
      script,
      /canonicalAsset/
    );

    assert.match(
      script,
      /otherTeamBlocks/
    );

    assert.match(
      script,
      /protectedFingerprint/
    );
  }
);

test(
  "MSE-25.207 finalization makes no renderer or routing mutation",
  () => {
    assert.doesNotMatch(
      script,
      /writeFileSync\([^)]*frontend/
    );

    assert.doesNotMatch(
      script,
      /sitemap/
    );

    assert.doesNotMatch(
      script,
      /routeFingerprint.*update/
    );
  }
);
