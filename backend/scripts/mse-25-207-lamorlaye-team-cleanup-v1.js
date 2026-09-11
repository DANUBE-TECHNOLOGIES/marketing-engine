const fs = require("fs");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SITE_ID = "cms8n8jdu00j7n91axodw128b";
const PAGE_ID = "cms8n8meo00jzn91akxbd5c5i";

const GENERIC_TEXT_ID =
  "cmsztn4f200gwtdhd9iproju9";

const GENERIC_TEAM_ID =
  "cmsztn4f200gxtdhdqdqffwmj";

const LEGACY_CTA_ID =
  "cmsztn4f200gytdhdlmhif90z";

const STEPHANIE_EDITORIAL_ID =
  "cmtvmj4ry0009kah7gxnezk5c";

const CANONICAL_CONTACT =
  "/agence/mondescale-lamorlaye/contact";

const SNAPSHOT =
  "/var/tmp/mse-25-207-lamorlaye-team-cleanup-v1.snapshot.json";

const APPLY =
  process.env.MSE_25_207_CONFIRM === "true";

const ROLLBACK =
  process.argv.includes("--rollback");

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [
          key,
          stable(value[key])
        ])
    );
  }

  return value;
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(stable(value))
    )
    .digest("hex");
}

function clone(value) {
  return JSON.parse(
    JSON.stringify(value)
  );
}

function normalizeProtectedBlock(block) {
  const copy = clone(block);

  if (
    block.id === GENERIC_TEXT_ID ||
    block.id === GENERIC_TEAM_ID
  ) {
    delete copy.visibleDesktop;
    delete copy.visibleMobile;
    delete copy.version;
  }

  if (block.id === LEGACY_CTA_ID) {
    if (
      copy.content &&
      copy.content.primaryCta
    ) {
      delete copy.content.primaryCta.href;
    }

    delete copy.version;
  }

  return copy;
}

async function readState() {
  const site = await prisma.agencySite.findUnique({
    where: {
      id: SITE_ID
    },
    include: {
      pages: {
        orderBy: [
          { displayOrder: "asc" },
          { id: "asc" }
        ],
        include: {
          blocks: {
            orderBy: [
              { displayOrder: "asc" },
              { id: "asc" }
            ]
          },
          sections: {
            orderBy: [
              { displayOrder: "asc" },
              { id: "asc" }
            ]
          }
        }
      }
    }
  });

  if (!site) {
    throw new Error(
      "Lamorlaye site not found"
    );
  }

  const page = site.pages.find(
    candidate => candidate.id === PAGE_ID
  );

  if (!page) {
    throw new Error(
      "Exact Lamorlaye Team page not found"
    );
  }

  if (
    page.slug !== "equipe" ||
    page.pageType !== "TEAM" ||
    page.path !==
      "/agence/mondescale-lamorlaye/equipe"
  ) {
    throw new Error(
      "Unexpected Team page identity"
    );
  }

  const byId = Object.fromEntries(
    page.blocks.map(block => [
      block.id,
      block
    ])
  );

  for (const id of [
    GENERIC_TEXT_ID,
    GENERIC_TEAM_ID,
    LEGACY_CTA_ID,
    STEPHANIE_EDITORIAL_ID
  ]) {
    if (!byId[id]) {
      throw new Error(
        `Required block missing: ${id}`
      );
    }
  }

  return {
    site,
    page,
    byId
  };
}

function protectedState(state) {
  const { site, page } = state;

  return {
    site: {
      id: site.id,
      slug: site.slug,
      agencyId: site.agencyId
    },

    page: {
      id: page.id,
      title: page.title,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      seoTitle: page.seoTitle,
      metaDescription:
        page.metaDescription,
      h1: page.h1,
      status: page.status,
      published: page.published,
      menuTitle: page.menuTitle,
      menuLocation: page.menuLocation,
      displayOrder: page.displayOrder
    },

    blocks: page.blocks.map(
      normalizeProtectedBlock
    ),

    sections: page.sections
  };
}

function exactTargetContract(state) {
  const {
    [GENERIC_TEXT_ID]: text,
    [GENERIC_TEAM_ID]: team,
    [LEGACY_CTA_ID]: cta,
    [STEPHANIE_EDITORIAL_ID]:
      stephanie
  } = state.byId;

  return {
    genericText: {
      id: text.id,
      blockType: text.blockType,
      status: text.status,
      visibleDesktop:
        text.visibleDesktop,
      visibleMobile:
        text.visibleMobile,
      version: text.version,
      content: text.content
    },

    genericTeam: {
      id: team.id,
      blockType: team.blockType,
      status: team.status,
      visibleDesktop:
        team.visibleDesktop,
      visibleMobile:
        team.visibleMobile,
      version: team.version,
      content: team.content
    },

    legacyCta: {
      id: cta.id,
      blockType: cta.blockType,
      status: cta.status,
      visibleDesktop:
        cta.visibleDesktop,
      visibleMobile:
        cta.visibleMobile,
      version: cta.version,
      content: cta.content
    },

    stephanieEditorial: {
      id: stephanie.id,
      blockType:
        stephanie.blockType,
      status: stephanie.status,
      visibleDesktop:
        stephanie.visibleDesktop,
      visibleMobile:
        stephanie.visibleMobile,
      version: stephanie.version,
      content: stephanie.content
    }
  };
}

function assertPreconditions(state) {
  const {
    [GENERIC_TEXT_ID]: text,
    [GENERIC_TEAM_ID]: team,
    [LEGACY_CTA_ID]: cta,
    [STEPHANIE_EDITORIAL_ID]:
      stephanie
  } = state.byId;

  if (
    text.blockType !== "text" ||
    text.status !== "draft"
  ) {
    throw new Error(
      "Unexpected generic text block"
    );
  }

  if (
    text.visibleDesktop !== true ||
    text.visibleMobile !== true
  ) {
    throw new Error(
      "Generic text visibility no longer matches expected precondition"
    );
  }

  if (
    !String(
      text.content?.text || ""
    ).includes(
      "Mondescale Lamorlaye accompagne ses clients"
    )
  ) {
    throw new Error(
      "Unexpected generic text content"
    );
  }

  if (
    team.blockType !== "team" ||
    team.status !== "draft"
  ) {
    throw new Error(
      "Unexpected generic team block"
    );
  }

  if (
    team.visibleDesktop !== true ||
    team.visibleMobile !== true
  ) {
    throw new Error(
      "Generic team visibility no longer matches expected precondition"
    );
  }

  const members =
    team.content?.members || [];

  if (
    members.length !== 1 ||
    members[0]?.name !==
      "Votre équipe"
  ) {
    throw new Error(
      "Unexpected generic team member contract"
    );
  }

  if (
    cta.blockType !== "cta" ||
    cta.status !== "draft"
  ) {
    throw new Error(
      "Unexpected legacy CTA block"
    );
  }

  if (
    cta.content?.primaryCta?.href !==
    "/contact"
  ) {
    throw new Error(
      "Legacy CTA no longer points to /contact"
    );
  }

  if (
    stephanie.blockType !==
      "rich_text" ||
    stephanie.status !==
      "published"
  ) {
    throw new Error(
      "Stephanie editorial block unexpectedly changed"
    );
  }

  if (
    !String(
      stephanie.content?.title || ""
    ).includes("Stéphanie")
  ) {
    throw new Error(
      "Stephanie editorial identity missing"
    );
  }
}

async function writeSnapshot(state) {
  if (
    fs.existsSync(SNAPSHOT)
  ) {
    throw new Error(
      `Snapshot already exists: ${SNAPSHOT}`
    );
  }

  const snapshot = {
    createdAt:
      new Date().toISOString(),

    ticket:
      "MSE-25.207",

    pageId:
      PAGE_ID,

    protectedFingerprint:
      fingerprint(
        protectedState(state)
      ),

    targets:
      exactTargetContract(state)
  };

  fs.writeFileSync(
    SNAPSHOT,
    JSON.stringify(
      snapshot,
      null,
      2
    )
  );

  return snapshot;
}

async function rollback() {
  if (
    !fs.existsSync(SNAPSHOT)
  ) {
    throw new Error(
      `Rollback snapshot missing: ${SNAPSHOT}`
    );
  }

  const snapshot = JSON.parse(
    fs.readFileSync(
      SNAPSHOT,
      "utf8"
    )
  );

  const text =
    snapshot.targets.genericText;

  const team =
    snapshot.targets.genericTeam;

  const cta =
    snapshot.targets.legacyCta;

  await prisma.$transaction([
    prisma.pageBlock.update({
      where: {
        id: GENERIC_TEXT_ID
      },
      data: {
        visibleDesktop:
          text.visibleDesktop,
        visibleMobile:
          text.visibleMobile,
        version:
          text.version,
        content:
          text.content
      }
    }),

    prisma.pageBlock.update({
      where: {
        id: GENERIC_TEAM_ID
      },
      data: {
        visibleDesktop:
          team.visibleDesktop,
        visibleMobile:
          team.visibleMobile,
        version:
          team.version,
        content:
          team.content
      }
    }),

    prisma.pageBlock.update({
      where: {
        id: LEGACY_CTA_ID
      },
      data: {
        version:
          cta.version,
        content:
          cta.content
      }
    })
  ]);

  console.log(
    JSON.stringify(
      {
        mode: "ROLLBACK",
        restored: true,
        snapshot: SNAPSHOT
      },
      null,
      2
    )
  );
}

async function main() {
  if (ROLLBACK) {
    await rollback();
    return;
  }

  const before =
    await readState();

  assertPreconditions(before);

  const protectedFingerprintBefore =
    fingerprint(
      protectedState(before)
    );

  const targetsBefore =
    exactTargetContract(before);

  const desired = {
    genericText: {
      visibleDesktop: false,
      visibleMobile: false
    },

    genericTeam: {
      visibleDesktop: false,
      visibleMobile: false
    },

    legacyCta: {
      primaryHref:
        CANONICAL_CONTACT
    }
  };

  if (!APPLY) {
    console.log(
      JSON.stringify(
        {
          mode: "DRY_RUN",

          page: {
            id: before.page.id,
            slug: before.page.slug,
            path: before.page.path,
            seoTitle:
              before.page.seoTitle,
            metaDescription:
              before.page
                .metaDescription,
            h1: before.page.h1
          },

          protectedFingerprintBefore,

          targetsBefore,

          desired,

          protected: {
            stephanieEditorialId:
              STEPHANIE_EDITORIAL_ID,
            pageSeo: true,
            allSections: true,
            allOtherBlocks: true,
            renderer: true,
            routing: true
          },

          snapshot:
            SNAPSHOT,

          databaseWrite:
            false
        },
        null,
        2
      )
    );

    console.log(
      "PASS: MSE-25.207 DRY-RUN only"
    );

    return;
  }

  const snapshot =
    await writeSnapshot(before);

  const text =
    before.byId[GENERIC_TEXT_ID];

  const team =
    before.byId[GENERIC_TEAM_ID];

  const cta =
    before.byId[LEGACY_CTA_ID];

  await prisma.$transaction([
    prisma.pageBlock.update({
      where: {
        id: GENERIC_TEXT_ID
      },
      data: {
        visibleDesktop: false,
        visibleMobile: false,
        version: {
          increment: 1
        }
      }
    }),

    prisma.pageBlock.update({
      where: {
        id: GENERIC_TEAM_ID
      },
      data: {
        visibleDesktop: false,
        visibleMobile: false,
        version: {
          increment: 1
        }
      }
    }),

    prisma.pageBlock.update({
      where: {
        id: LEGACY_CTA_ID
      },
      data: {
        content: {
          ...cta.content,
          primaryCta: {
            ...cta.content.primaryCta,
            href:
              CANONICAL_CONTACT
          }
        },
        version: {
          increment: 1
        }
      }
    })
  ]);

  const after =
    await readState();

  const protectedFingerprintAfter =
    fingerprint(
      protectedState(after)
    );

  if (
    protectedFingerprintAfter !==
    protectedFingerprintBefore
  ) {
    throw new Error(
      [
        "Protected state changed.",
        `before=${protectedFingerprintBefore}`,
        `after=${protectedFingerprintAfter}`,
        `snapshot=${SNAPSHOT}`
      ].join(" ")
    );
  }

  const textAfter =
    after.byId[GENERIC_TEXT_ID];

  const teamAfter =
    after.byId[GENERIC_TEAM_ID];

  const ctaAfter =
    after.byId[LEGACY_CTA_ID];

  if (
    textAfter.visibleDesktop !==
      false ||
    textAfter.visibleMobile !==
      false
  ) {
    throw new Error(
      "Generic text not fully hidden"
    );
  }

  if (
    teamAfter.visibleDesktop !==
      false ||
    teamAfter.visibleMobile !==
      false
  ) {
    throw new Error(
      "Generic team not fully hidden"
    );
  }

  if (
    ctaAfter.content
      ?.primaryCta?.href !==
    CANONICAL_CONTACT
  ) {
    throw new Error(
      "Legacy CTA canonical href not applied"
    );
  }

  console.log(
    JSON.stringify(
      {
        mode: "APPLY",

        protectedFingerprintBefore,
        protectedFingerprintAfter,

        protectedUnchanged:
          protectedFingerprintBefore ===
          protectedFingerprintAfter,

        snapshot: {
          path: SNAPSHOT,
          createdAt:
            snapshot.createdAt
        },

        targetsAfter: {
          genericText: {
            visibleDesktop:
              textAfter
                .visibleDesktop,
            visibleMobile:
              textAfter
                .visibleMobile,
            version:
              textAfter.version
          },

          genericTeam: {
            visibleDesktop:
              teamAfter
                .visibleDesktop,
            visibleMobile:
              teamAfter
                .visibleMobile,
            version:
              teamAfter.version
          },

          legacyCta: {
            primaryHref:
              ctaAfter.content
                ?.primaryCta
                ?.href,
            version:
              ctaAfter.version
          }
        }
      },
      null,
      2
    )
  );

  console.log(
    "PASS: MSE-25.207 applied"
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(
    () => prisma.$disconnect()
  );
