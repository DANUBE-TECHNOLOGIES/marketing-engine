"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TICKET = "MSE-25.207";

const SITE_ID =
  "cms8n8jdu00j7n91axodw128b";

const HOME_PAGE_ID =
  "cms8n8jen00j9n91a25i1tspp";

const HOME_TEAM_BLOCK_ID =
  "cmsztn4io00hntdhdomq7iobf";

const TEAM_PAGE_ID =
  "cms8n8meo00jzn91akxbd5c5i";

const TARGET_TEAM_BLOCK_ID =
  "cmsztn4f200gxtdhdqdqffwmj";

const STEPHANIE_EDITORIAL_ID =
  "cmtvmj4ry0009kah7gxnezk5c";

const STEPHANIE_ASSET_ID =
  "cmsrqxgrr000kmn1a8d2q83va";

const EXPECTED_IMAGE_URL =
  "/media/assets/tenant_mondescale/team-portrait/2026/08/820a6b99-69be-4bf4-9d68-b34cd5959c32.png";

const SNAPSHOT_PATH =
  process.env.MSE_25_207_PROFILE_SNAPSHOT ||
  "/var/tmp/mse-25-207-lamorlaye-team-profile-finalize-v1.snapshot.json";

const APPLY =
  String(
    process.env.MSE_25_207_PROFILE_CONFIRM || ""
  ).toLowerCase() === "true";

const ROLLBACK =
  process.argv.includes("--rollback");

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] =
          stable(value[key]);

        return acc;
      }, {});
  }

  return value;
}

function equal(a, b) {
  return (
    JSON.stringify(stable(a)) ===
    JSON.stringify(stable(b))
  );
}

function hash(value) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(
        stable(value)
      )
    )
    .digest("hex");
}

function blockContract(block) {
  return {
    id: block.id,
    pageId: block.pageId,
    blockType: block.blockType,
    name: block.name,
    content: clone(block.content),
    settings: clone(block.settings),
    seo: clone(block.seo),
    displayOrder: block.displayOrder,
    status: block.status,
    visibleDesktop:
      block.visibleDesktop,
    visibleMobile:
      block.visibleMobile,
    version: block.version
  };
}

function pageContract(page) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    path: page.path,
    pageType: page.pageType,
    seoTitle: page.seoTitle,
    metaDescription:
      page.metaDescription,
    h1: page.h1,
    schemaType: page.schemaType,
    status: page.status,
    published: page.published
  };
}

async function loadState() {
  const site =
    await prisma.agencySite.findUnique({
      where: {
        id: SITE_ID
      },
      include: {
        pages: {
          include: {
            blocks: {
              orderBy: {
                displayOrder: "asc"
              }
            }
          }
        }
      }
    });

  if (!site) {
    throw new Error(
      "Lamorlaye site missing"
    );
  }

  const home =
    site.pages.find(
      page =>
        page.id === HOME_PAGE_ID
    );

  const teamPage =
    site.pages.find(
      page =>
        page.id === TEAM_PAGE_ID
    );

  if (!home) {
    throw new Error(
      "Canonical Lamorlaye home missing"
    );
  }

  if (!teamPage) {
    throw new Error(
      "Lamorlaye Team page missing"
    );
  }

  const homeTeam =
    home.blocks.find(
      block =>
        block.id ===
        HOME_TEAM_BLOCK_ID
    );

  const targetTeam =
    teamPage.blocks.find(
      block =>
        block.id ===
        TARGET_TEAM_BLOCK_ID
    );

  const editorial =
    teamPage.blocks.find(
      block =>
        block.id ===
        STEPHANIE_EDITORIAL_ID
    );

  if (!homeTeam) {
    throw new Error(
      "Canonical Home Team block missing"
    );
  }

  if (!targetTeam) {
    throw new Error(
      "Target Team block missing"
    );
  }

  if (!editorial) {
    throw new Error(
      "Stephanie editorial block missing"
    );
  }

  const asset =
    await prisma.asset.findUnique({
      where: {
        id: STEPHANIE_ASSET_ID
      }
    });

  if (!asset) {
    throw new Error(
      "Stephanie asset missing"
    );
  }

  return {
    site,
    home,
    teamPage,
    homeTeam,
    targetTeam,
    editorial,
    asset
  };
}

function canonicalStephanie(state) {
  const content =
    state.homeTeam.content &&
    typeof state.homeTeam.content ===
      "object" &&
    !Array.isArray(
      state.homeTeam.content
    )
      ? state.homeTeam.content
      : {};

  const members =
    Array.isArray(content.members)
      ? content.members
      : [];

  if (members.length !== 1) {
    throw new Error(
      `Expected exactly one Home Team member, got ${members.length}`
    );
  }

  const member =
    clone(members[0]);

  if (
    member.name !== "Stéphanie"
  ) {
    throw new Error(
      "Unexpected canonical member name"
    );
  }

  if (
    member.role !==
    "Conseillère voyage"
  ) {
    throw new Error(
      "Unexpected canonical member role"
    );
  }

  if (
    member.imageAssetId !==
    STEPHANIE_ASSET_ID
  ) {
    throw new Error(
      "Unexpected canonical Stephanie asset id"
    );
  }

  return {
    content,
    member
  };
}

function assertSourceContract(state) {
  if (
    state.home.slug !== "home" ||
    state.home.path !==
      "/agence/mondescale-lamorlaye" ||
    state.home.status !==
      "published" ||
    state.home.published !== true
  ) {
    throw new Error(
      "Canonical Home page contract changed"
    );
  }

  if (
    state.homeTeam.blockType !==
      "team" ||
    state.homeTeam.status !==
      "published" ||
    state.homeTeam.visibleDesktop !==
      true ||
    state.homeTeam.visibleMobile !==
      true ||
    state.homeTeam.version !== 2
  ) {
    throw new Error(
      "Canonical Home Team block contract changed"
    );
  }

  const {
    content,
    member
  } = canonicalStephanie(state);

  if (
    content.title !==
    "Stéphanie, votre conseillère voyage à Lamorlaye"
  ) {
    throw new Error(
      "Unexpected canonical Team title"
    );
  }

  if (
    content.text !==
    "Un accompagnement en agence pour construire votre projet de voyage."
  ) {
    throw new Error(
      "Unexpected canonical Team introduction"
    );
  }

  if (
    state.asset.status !==
      "published" ||
    state.asset.type !==
      "MEDIA_IMAGE"
  ) {
    throw new Error(
      "Stephanie asset no longer published"
    );
  }

  const payload =
    state.asset.payload &&
    typeof state.asset.payload ===
      "object" &&
    !Array.isArray(
      state.asset.payload
    )
      ? state.asset.payload
      : {};

  if (
    payload.url !==
    EXPECTED_IMAGE_URL
  ) {
    throw new Error(
      "Stephanie image URL changed"
    );
  }

  if (
    member.imageAlt !==
    "Stéphanie, conseillère voyage à l'agence Mondescale Lamorlaye"
  ) {
    throw new Error(
      "Stephanie image alt changed"
    );
  }
}

function assertCurrentTarget(state) {
  const block =
    state.targetTeam;

  if (
    block.blockType !== "team" ||
    block.status !== "draft" ||
    block.visibleDesktop !==
      false ||
    block.visibleMobile !==
      false ||
    block.version !== 2
  ) {
    throw new Error(
      "Target Team block is not in expected post-cleanup state"
    );
  }

  const expected = {
    title:
      "Une équipe à votre écoute",
    members: [
      {
        name: "Votre équipe",
        role:
          "Conseillers voyages",
        imageAlt: null,
        imageUrl: null,
        description:
          "Des professionnels disponibles pour construire votre prochain voyage.",
        imageAssetId: null
      }
    ]
  };

  if (
    !equal(
      block.content,
      expected
    )
  ) {
    throw new Error(
      "Target Team placeholder content changed"
    );
  }

  if (
    state.editorial.status !==
      "published" ||
    state.editorial.visibleDesktop !==
      true ||
    state.editorial.visibleMobile !==
      true ||
    state.editorial.version !== 1
  ) {
    throw new Error(
      "Stephanie editorial contract changed"
    );
  }

  if (
    state.editorial.content?.title !==
    "Stéphanie — Conseillère voyage à Lamorlaye"
  ) {
    throw new Error(
      "Stephanie editorial title changed"
    );
  }
}

function desiredContent(state) {
  const {
    content,
    member
  } = canonicalStephanie(state);

  const projected =
    clone(member);

  /*
   * Keep the canonical identity, role,
   * short description and real media.
   *
   * The long presentation already exists
   * as the dedicated published editorial
   * block on the Team page. Removing only
   * this duplicate projection prevents the
   * same paragraph from being rendered twice.
   */
  delete projected.presentation;

  return {
    ...clone(content),
    members: [
      projected
    ]
  };
}

function protectedState(state) {
  return {
    teamPage:
      pageContract(
        state.teamPage
      ),

    otherTeamBlocks:
      state.teamPage.blocks
        .filter(
          block =>
            block.id !==
            TARGET_TEAM_BLOCK_ID
        )
        .map(blockContract)
        .sort(
          (a, b) =>
            String(a.id)
              .localeCompare(
                String(b.id)
              )
        ),

    canonicalHome:
      pageContract(
        state.home
      ),

    canonicalHomeTeam:
      blockContract(
        state.homeTeam
      ),

    canonicalAsset: {
      id: state.asset.id,
      tenantId:
        state.asset.tenantId,
      type: state.asset.type,
      status:
        state.asset.status,
      title:
        state.asset.title,
      slug:
        state.asset.slug,
      summary:
        state.asset.summary,
      payload:
        clone(
          state.asset.payload
        ),
      metadata:
        clone(
          state.asset.metadata
        ),
      tags:
        clone(
          state.asset.tags
        ),
      currentVersion:
        state.asset.currentVersion,
      publishedAt:
        state.asset.publishedAt
    }
  };
}

function protectedFingerprint(
  state
) {
  return hash(
    protectedState(state)
  );
}

function snapshotPayload(state) {
  return {
    ticket: TICKET,
    phase:
      "team-profile-finalize-v1",
    createdAt:
      new Date().toISOString(),

    siteId:
      SITE_ID,

    teamPageId:
      TEAM_PAGE_ID,

    targetBlock:
      blockContract(
        state.targetTeam
      ),

    protectedFingerprint:
      protectedFingerprint(
        state
      )
  };
}

function writeSnapshot(state) {
  const expectedTarget =
    blockContract(
      state.targetTeam
    );

  const expectedFingerprint =
    protectedFingerprint(
      state
    );

  if (
    fs.existsSync(
      SNAPSHOT_PATH
    )
  ) {
    const existing =
      JSON.parse(
        fs.readFileSync(
          SNAPSHOT_PATH,
          "utf8"
        )
      );

    if (
      existing.ticket !==
        TICKET ||
      existing.phase !==
        "team-profile-finalize-v1" ||
      existing.siteId !==
        SITE_ID ||
      existing.teamPageId !==
        TEAM_PAGE_ID ||
      existing.protectedFingerprint !==
        expectedFingerprint ||
      !equal(
        existing.targetBlock,
        expectedTarget
      )
    ) {
      throw new Error(
        `Existing finalization snapshot does not match current state: ${SNAPSHOT_PATH}`
      );
    }

    return existing;
  }

  const payload =
    snapshotPayload(state);

  fs.writeFileSync(
    SNAPSHOT_PATH,
    JSON.stringify(
      payload,
      null,
      2
    ),
    {
      flag: "wx"
    }
  );

  return payload;
}

async function rollback() {
  if (
    !fs.existsSync(
      SNAPSHOT_PATH
    )
  ) {
    throw new Error(
      `Rollback snapshot missing: ${SNAPSHOT_PATH}`
    );
  }

  const snapshot =
    JSON.parse(
      fs.readFileSync(
        SNAPSHOT_PATH,
        "utf8"
      )
    );

  if (
    snapshot.ticket !==
      TICKET ||
    snapshot.phase !==
      "team-profile-finalize-v1" ||
    snapshot.teamPageId !==
      TEAM_PAGE_ID ||
    snapshot.targetBlock?.id !==
      TARGET_TEAM_BLOCK_ID
  ) {
    throw new Error(
      "Rollback snapshot contract invalid"
    );
  }

  const b =
    snapshot.targetBlock;

  await prisma.$transaction(
    async tx => {
      await tx.pageBlock.update({
        where: {
          id:
            TARGET_TEAM_BLOCK_ID
        },
        data: {
          content:
            clone(b.content),
          status:
            b.status,
          visibleDesktop:
            b.visibleDesktop,
          visibleMobile:
            b.visibleMobile,
          version:
            b.version
        }
      });
    }
  );

  console.log(
    JSON.stringify({
      mode: "ROLLBACK",
      snapshot:
        SNAPSHOT_PATH,
      restoredBlockId:
        TARGET_TEAM_BLOCK_ID,
      restoredVersion:
        b.version
    }, null, 2)
  );

  console.log(
    "PASS: MSE-25.207 Team profile finalization rolled back"
  );
}

async function main() {
  if (ROLLBACK) {
    await rollback();
    return;
  }

  const before =
    await loadState();

  assertSourceContract(
    before
  );

  assertCurrentTarget(
    before
  );

  const fingerprintBefore =
    protectedFingerprint(
      before
    );

  const content =
    desiredContent(
      before
    );

  const report = {
    mode:
      APPLY
        ? "APPLY"
        : "DRY_RUN",

    source: {
      pageId:
        HOME_PAGE_ID,
      blockId:
        HOME_TEAM_BLOCK_ID,
      assetId:
        STEPHANIE_ASSET_ID,
      imageUrl:
        EXPECTED_IMAGE_URL
    },

    targetBefore: {
      id:
        before.targetTeam.id,
      visibleDesktop:
        before.targetTeam.visibleDesktop,
      visibleMobile:
        before.targetTeam.visibleMobile,
      version:
        before.targetTeam.version,
      content:
        before.targetTeam.content
    },

    desired: {
      visibleDesktop:
        true,
      visibleMobile:
        true,
      status:
        before.targetTeam.status,
      version:
        before.targetTeam.version +
        1,
      content
    },

    editorialPreserved: {
      id:
        before.editorial.id,
      title:
        before.editorial.content?.title,
      visibleDesktop:
        before.editorial.visibleDesktop,
      visibleMobile:
        before.editorial.visibleMobile,
      version:
        before.editorial.version
    },

    protectedFingerprintBefore:
      fingerprintBefore,

    snapshot:
      SNAPSHOT_PATH,

    databaseWrite:
      APPLY
  };

  if (!APPLY) {
    console.log(
      JSON.stringify(
        report,
        null,
        2
      )
    );

    console.log(
      "PASS: MSE-25.207 Team profile finalization DRY-RUN only"
    );

    return;
  }

  const snapshot =
    writeSnapshot(before);

  await prisma.$transaction(
    async tx => {
      await tx.pageBlock.update({
        where: {
          id:
            TARGET_TEAM_BLOCK_ID
        },
        data: {
          content,
          visibleDesktop:
            true,
          visibleMobile:
            true,
          version:
            before.targetTeam.version +
            1
        }
      });
    }
  );

  const after =
    await loadState();

  const fingerprintAfter =
    protectedFingerprint(
      after
    );

  if (
    fingerprintBefore !==
    fingerprintAfter
  ) {
    throw new Error(
      `Protected fingerprint changed: before=${fingerprintBefore} after=${fingerprintAfter}`
    );
  }

  if (
    after.targetTeam.visibleDesktop !==
      true ||
    after.targetTeam.visibleMobile !==
      true ||
    after.targetTeam.version !==
      3
  ) {
    throw new Error(
      "Final Team block visibility/version incorrect"
    );
  }

  if (
    !equal(
      after.targetTeam.content,
      content
    )
  ) {
    throw new Error(
      "Final Team block content mismatch"
    );
  }

  if (
    after.editorial.version !==
      before.editorial.version ||
    after.editorial.visibleDesktop !==
      before.editorial.visibleDesktop ||
    after.editorial.visibleMobile !==
      before.editorial.visibleMobile ||
    !equal(
      after.editorial.content,
      before.editorial.content
    )
  ) {
    throw new Error(
      "Stephanie editorial changed"
    );
  }

  console.log(
    JSON.stringify({
      mode: "APPLY",

      protectedFingerprintBefore:
        fingerprintBefore,

      protectedFingerprintAfter:
        fingerprintAfter,

      protectedUnchanged:
        fingerprintBefore ===
        fingerprintAfter,

      snapshot: {
        path:
          SNAPSHOT_PATH,
        createdAt:
          snapshot.createdAt
      },

      targetAfter: {
        id:
          after.targetTeam.id,
        visibleDesktop:
          after.targetTeam.visibleDesktop,
        visibleMobile:
          after.targetTeam.visibleMobile,
        version:
          after.targetTeam.version,
        content:
          after.targetTeam.content
      },

      editorialPreserved:
        true
    }, null, 2)
  );

  console.log(
    "PASS: MSE-25.207 Team profile finalization applied"
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(
    () =>
      prisma.$disconnect()
  );
