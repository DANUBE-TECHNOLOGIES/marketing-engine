const crypto = require("node:crypto");
const fs = require("node:fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SITE_ID = "cms8n8jdu00j7n91axodw128b";
const SITE_SLUG = "mondescale-lamorlaye";

const PAGE_ID = "cms8n8o6i00ltn91avznzg60l";
const PAGE_SLUG = "avis";

const REVIEWS_BLOCK_ID = "cmsztn48i00fvtdhdksqeaebx";
const GENERIC_TEXT_BLOCK_ID = "cmsztn48i00fytdhd1o8i3bwi";
const CTA_BLOCK_ID = "cmsztn48i00fztdhdj484etfa";
const EDITORIAL_BLOCK_ID = "cmsztn48i00g0tdhdtiyc3ic0";

const SNAPSHOT =
  "/var/tmp/mse-25-205-lamorlaye-reviews-grounding-v1.snapshot.json";

const CONTACT_HREF =
  "/agence/mondescale-lamorlaye/contact";

const TEAM_HREF =
  "/agence/mondescale-lamorlaye/equipe";

const DESIRED_PAGE = {
  title: "Avis de nos clients",
  seoTitle:
    "Avis clients Mondescale Lamorlaye | Agence de voyages",
  metaDescription:
    "Découvrez les avis des voyageurs accompagnés par Mondescale Lamorlaye pour leurs séjours, circuits, voyages sur mesure et autres projets de vacances avec Stéphanie.",
  h1:
    "Avis sur votre agence Mondescale Lamorlaye"
};

const DESIRED_REVIEWS = {
  title: "Les avis Google de nos voyageurs",
  text:
    "Découvrez les avis des voyageurs accompagnés par Mondescale Lamorlaye pour leurs séjours, circuits, voyages sur mesure et autres projets de vacances. Leurs témoignages reflètent leur expérience avec l’agence et l’accompagnement de Stéphanie."
};

const DESIRED_EDITORIAL = {
  title: "Des expériences de voyage concrètes",
  html:
    "<p>Parmi les avis publiés, des voyageurs racontent notamment l’accompagnement de Stéphanie pour un séjour tout compris en République dominicaine et pour l’organisation d’un road trip sur mesure dans l’Ouest américain.</p><p>D’autres soulignent son écoute, sa disponibilité et sa capacité à rechercher une solution adaptée à leur projet. Ces témoignages sont affichés depuis la source Google Business Profile de l’agence.</p>",
  alignment: "left"
};

const DESIRED_CTA = {
  title: "Préparons votre prochain voyage",
  text:
    "Vous avez un projet de séjour, de circuit, de croisière ou de voyage sur mesure ? Venez rencontrer Stéphanie à l’agence Mondescale Lamorlaye pour échanger sur vos envies et les solutions disponibles.",
  style: "primary",
  primaryCta: {
    href: CONTACT_HREF,
    label: "Contacter l’agence"
  },
  secondaryCta: {
    href: TEAM_HREF,
    label: "Rencontrer Stéphanie"
  }
};

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (
    value &&
    typeof value === "object" &&
    value.constructor === Object
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, stable(child)])
    );
  }

  return value;
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

async function loadState(client = prisma) {
  const site = await client.agencySite.findUnique({
    where: { id: SITE_ID },
    include: {
      agency: true,
      pages: {
        orderBy: [
          { displayOrder: "asc" },
          { slug: "asc" }
        ],
        include: {
          blocks: {
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
    throw new Error("Target Lamorlaye site not found");
  }

  if (site.slug !== SITE_SLUG) {
    throw new Error(`Unexpected site slug: ${site.slug}`);
  }

  const page = site.pages.find(
    candidate => candidate.id === PAGE_ID
  );

  if (!page) {
    throw new Error("Exact Lamorlaye Avis page not found");
  }

  if (
    page.slug !== PAGE_SLUG ||
    page.pageType !== "REVIEWS"
  ) {
    throw new Error(
      `Unexpected reviews page contract: ${page.slug}/${page.pageType}`
    );
  }

  const block = id =>
    page.blocks.find(candidate => candidate.id === id);

  const reviewsBlock = block(REVIEWS_BLOCK_ID);
  const genericTextBlock = block(GENERIC_TEXT_BLOCK_ID);
  const ctaBlock = block(CTA_BLOCK_ID);
  const editorialBlock = block(EDITORIAL_BLOCK_ID);

  for (const [name, value] of Object.entries({
    reviewsBlock,
    genericTextBlock,
    ctaBlock,
    editorialBlock
  })) {
    if (!value) {
      throw new Error(`Required ${name} not found`);
    }
  }

  if (reviewsBlock.blockType !== "reviews") {
    throw new Error("Unexpected Google reviews block type");
  }

  if (
    reviewsBlock.settings?.dataSource !==
    "google-reviews"
  ) {
    throw new Error(
      "Reviews block is not grounded on google-reviews"
    );
  }

  if (genericTextBlock.blockType !== "text") {
    throw new Error("Unexpected generic text block type");
  }

  if (ctaBlock.blockType !== "cta") {
    throw new Error("Unexpected CTA block type");
  }

  if (
    editorialBlock.blockType !== "rich_text" ||
    editorialBlock.status !== "published"
  ) {
    throw new Error(
      "Expected published review editorial rich_text"
    );
  }

  const protectedState = {
    agency: {
      id: site.agency?.id,
      name: site.agency?.name,
      city: site.agency?.city,
      address: site.agency?.address,
      postalCode: site.agency?.postalCode,
      phone: site.agency?.phone,
      email: site.agency?.email,
      googleReviewUrl: site.agency?.googleReviewUrl,
      googleLocationId: site.agency?.googleLocationId
    },

    routes: site.pages.map(candidate => ({
      id: candidate.id,
      slug: candidate.slug,
      path: candidate.path,
      pageType: candidate.pageType,
      published: candidate.published,
      status: candidate.status
    })),

    nonReviewsPages: site.pages
      .filter(candidate => candidate.id !== PAGE_ID)
      .map(candidate => ({
        id: candidate.id,
        title: candidate.title,
        seoTitle: candidate.seoTitle,
        metaDescription: candidate.metaDescription,
        h1: candidate.h1,
        blocks: candidate.blocks.map(item => ({
          id: item.id,
          blockType: item.blockType,
          status: item.status,
          visibleDesktop: item.visibleDesktop,
          visibleMobile: item.visibleMobile,
          version: item.version,
          content: item.content
        }))
      }))
  };

  return {
    site,
    page,
    reviewsBlock,
    genericTextBlock,
    ctaBlock,
    editorialBlock,
    protectedState,
    protectedFingerprint: fingerprint(protectedState)
  };
}

function snapshotFrom(state) {
  return {
    createdAt: new Date().toISOString(),
    siteId: SITE_ID,
    pageId: PAGE_ID,
    protectedFingerprintBefore:
      state.protectedFingerprint,

    page: {
      title: state.page.title,
      seoTitle: state.page.seoTitle,
      metaDescription: state.page.metaDescription,
      h1: state.page.h1
    },

    blocks: [
      state.reviewsBlock,
      state.genericTextBlock,
      state.ctaBlock,
      state.editorialBlock
    ].map(block => ({
      id: block.id,
      content: block.content,
      status: block.status,
      visibleDesktop: block.visibleDesktop,
      visibleMobile: block.visibleMobile,
      version: block.version
    }))
  };
}

async function rollback() {
  if (!fs.existsSync(SNAPSHOT)) {
    throw new Error(
      `Rollback snapshot missing: ${SNAPSHOT}`
    );
  }

  const snapshot = JSON.parse(
    fs.readFileSync(SNAPSHOT, "utf8")
  );

  if (
    snapshot.siteId !== SITE_ID ||
    snapshot.pageId !== PAGE_ID
  ) {
    throw new Error("Snapshot target mismatch");
  }

  await prisma.$transaction(async tx => {
    await tx.agencySitePage.update({
      where: { id: PAGE_ID },
      data: snapshot.page
    });

    for (const block of snapshot.blocks) {
      await tx.pageBlock.update({
        where: { id: block.id },
        data: {
          content: block.content,
          status: block.status,
          visibleDesktop: block.visibleDesktop,
          visibleMobile: block.visibleMobile,
          version: block.version
        }
      });
    }
  });

  console.log(
    "PASS: MSE-25.205 rollback restored snapshot"
  );
}

async function apply() {
  const before = await loadState();

  const snapshot = snapshotFrom(before);

  if (!fs.existsSync(SNAPSHOT)) {
    fs.writeFileSync(
      SNAPSHOT,
      JSON.stringify(snapshot, null, 2)
    );
  } else {
    console.log(
      "INFO: existing snapshot preserved; not overwritten"
    );
  }

  await prisma.$transaction(async tx => {
    await tx.agencySitePage.update({
      where: { id: PAGE_ID },
      data: DESIRED_PAGE
    });

    await tx.pageBlock.update({
      where: { id: REVIEWS_BLOCK_ID },
      data: {
        content: {
          ...before.reviewsBlock.content,
          ...DESIRED_REVIEWS
        },
        version: {
          increment: 1
        }
      }
    });

    await tx.pageBlock.update({
      where: { id: GENERIC_TEXT_BLOCK_ID },
      data: {
        visibleDesktop: false,
        visibleMobile: false,
        version: {
          increment: 1
        }
      }
    });

    await tx.pageBlock.update({
      where: { id: CTA_BLOCK_ID },
      data: {
        content: DESIRED_CTA,
        version: {
          increment: 1
        }
      }
    });

    await tx.pageBlock.update({
      where: { id: EDITORIAL_BLOCK_ID },
      data: {
        content: DESIRED_EDITORIAL,
        version: {
          increment: 1
        }
      }
    });
  });

  const after = await loadState();

  console.log(
    JSON.stringify(
      {
        mode: "APPLY",
        page: {
          before: {
            title: before.page.title,
            seoTitle: before.page.seoTitle,
            metaDescription:
              before.page.metaDescription,
            h1: before.page.h1
          },

          after: {
            title: after.page.title,
            seoTitle: after.page.seoTitle,
            metaDescription:
              after.page.metaDescription,
            h1: after.page.h1
          }
        },

        blocks: {
          reviews: {
            id: after.reviewsBlock.id,
            content: after.reviewsBlock.content
          },

          genericText: {
            id: after.genericTextBlock.id,
            visibleDesktop:
              after.genericTextBlock.visibleDesktop,
            visibleMobile:
              after.genericTextBlock.visibleMobile
          },

          cta: {
            id: after.ctaBlock.id,
            content: after.ctaBlock.content
          },

          editorial: {
            id: after.editorialBlock.id,
            content: after.editorialBlock.content
          }
        },

        protectedFingerprintBefore:
          before.protectedFingerprint,

        protectedFingerprintAfter:
          after.protectedFingerprint,

        protectedUnchanged:
          before.protectedFingerprint ===
          after.protectedFingerprint
      },
      null,
      2
    )
  );

  if (
    before.protectedFingerprint !==
    after.protectedFingerprint
  ) {
    throw new Error(
      "Protected Lamorlaye state changed"
    );
  }

  console.log("PASS: MSE-25.205 applied");
}

async function dryRun() {
  const state = await loadState();

  console.log(
    JSON.stringify(
      {
        mode: "DRY_RUN",
        target: {
          siteId: SITE_ID,
          siteSlug: SITE_SLUG,
          pageId: PAGE_ID,
          pageSlug: PAGE_SLUG
        },

        current: {
          page: {
            title: state.page.title,
            seoTitle: state.page.seoTitle,
            metaDescription:
              state.page.metaDescription,
            h1: state.page.h1
          },

          reviewsBlock: {
            id: state.reviewsBlock.id,
            status: state.reviewsBlock.status,
            settings: state.reviewsBlock.settings,
            content: state.reviewsBlock.content
          },

          genericTextBlock: {
            id: state.genericTextBlock.id,
            status: state.genericTextBlock.status,
            visibleDesktop:
              state.genericTextBlock.visibleDesktop,
            visibleMobile:
              state.genericTextBlock.visibleMobile,
            content: state.genericTextBlock.content
          },

          ctaBlock: {
            id: state.ctaBlock.id,
            status: state.ctaBlock.status,
            content: state.ctaBlock.content
          },

          editorialBlock: {
            id: state.editorialBlock.id,
            status: state.editorialBlock.status,
            content: state.editorialBlock.content
          }
        },

        desired: {
          page: DESIRED_PAGE,
          reviews: DESIRED_REVIEWS,
          genericTextVisibility: {
            visibleDesktop: false,
            visibleMobile: false
          },
          cta: DESIRED_CTA,
          editorial: DESIRED_EDITORIAL
        },

        protectedFingerprint:
          state.protectedFingerprint,

        snapshot: SNAPSHOT
      },
      null,
      2
    )
  );

  console.log(
    "PASS: dry-run only — no database write"
  );
}

(async () => {
  if (process.env.MSE_25_205_ROLLBACK === "true") {
    await rollback();
    return;
  }

  if (process.env.MSE_25_205_CONFIRM === "true") {
    await apply();
    return;
  }

  await dryRun();
})()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
