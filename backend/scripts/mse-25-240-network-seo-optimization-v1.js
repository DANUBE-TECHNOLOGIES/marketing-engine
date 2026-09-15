"use strict";

const crypto = require("node:crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

const PLANS = {
  "tui-store-amilly": {
    metadata: {
      seoTitle: "Agence de voyages Amilly & Montargis | TUI STORE",
      metaDescription:
        "Agence de voyages TUI STORE à Amilly, près de Montargis : séjours, circuits, croisières et voyages sur mesure. Conseils et devis en agence.",
    },
  },

  "mondescale-lamorlaye": {
    metadata: {
      seoTitle: "Agence de voyages Lamorlaye | Mondescale Voyages",
      metaDescription:
        "Agence de voyages à Lamorlaye, près de Chantilly et Gouvieux : séjours, circuits, croisières, billetterie et voyages sur mesure avec Stéphanie.",
    },
  },

  "ambassade-fram-mondescale-nevers": {
    metadata: {
      seoTitle: "Agence de voyages Nevers | Ambassade FRAM Mondescale",
      metaDescription:
        "Agence de voyages à Nevers : séjours FRAM, circuits, croisières, billets d’avion et voyages sur mesure. Conseils personnalisés et devis en agence.",
    },
  },

  "ambassade-fram-mondescale-gien": {
    metadata: {
      /*
       * Preserve the strong FRAM intent while improving the broader
       * "voyages" snippet.
       */
      seoTitle: "FRAM Gien | Agence de voyages Ambassade FRAM Mondescale",
      metaDescription:
        "Ambassade FRAM et agence de voyages à Gien : séjours FRAM, circuits, croisières et voyages sur mesure. Conseils et devis auprès de votre agence.",
    },
  },

  "ambassade-fram-mondescale-dax": {
    metadata: null,
    content: {
      sectionType: "agency-introduction",
      patch: {
        title: "Votre agence de voyages à Dax",
        paragraph:
          "À Dax, notre équipe vous accompagne pour préparer vos séjours, circuits, croisières et voyages sur mesure. Échangez avec votre conseiller pour construire un voyage adapté à votre projet.",
        link: {
          href: "/agence/ambassade-fram-mondescale-dax/services",
          label: "Découvrir nos services de voyage",
        },
      },
    },
  },

  "ambassade-fram-mondescale-bois-colombes": {
    metadata: {
      seoTitle:
        "Agence de voyages Bois-Colombes | Ambassade FRAM Mondescale",
      metaDescription:
        "Agence de voyages à Bois-Colombes : séjours FRAM, circuits, croisières, billets d’avion et voyages sur mesure. Conseils et devis personnalisés.",
    },
    content: {
      sectionType: "rich-text",
      patch: {
        title: "Votre agence de voyages à Bois-Colombes",
        text:
          "Notre équipe à Bois-Colombes vous conseille pour vos séjours, circuits, croisières et voyages sur mesure, avant, pendant et après votre voyage.",
        link: {
          href:
            "/agence/ambassade-fram-mondescale-bois-colombes/services",
          label: "Découvrir nos services de voyage",
        },
      },
    },
  },

  "tui-store-melun": {
    metadata: {
      /*
       * Keep TUI in the snippet: "tui" already ranks 4.40 but has 0 CTR.
       */
      seoTitle: "TUI STORE Melun | Agence de voyages, séjours & circuits",
      metaDescription:
        "TUI STORE Melun, agence de voyages à Melun : séjours, circuits, croisières, billets d’avion, autotours et voyages sur mesure. Conseils et devis.",
    },
    content: {
      sectionType: "agency-introduction",
      patch: {
        title: "TUI STORE Melun, votre agence de voyages à Melun",
        paragraph:
          "À Melun, notre équipe vous accompagne pour vos séjours, circuits, croisières, billets d’avion, autotours et voyages sur mesure.",
        link: {
          href: "/agence/tui-store-melun/services",
          label: "Découvrir nos services de voyage",
        },
      },
    },
  },

  "ambassade-fram-mondescale-ozoir-la-ferriere": {
    metadata: {
      seoTitle:
        "Agence de voyages Ozoir-la-Ferrière | Ambassade FRAM",
      metaDescription:
        "Agence de voyages à Ozoir-la-Ferrière : séjours FRAM, circuits, croisières, billets d’avion et voyages sur mesure. Conseils et devis personnalisés.",
    },
  },
};

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value ?? null))
    .digest("hex");
}

function homeScore(page) {
  let score = 0;

  const slug = clean(page.slug).toLowerCase();
  const path = clean(page.path).toLowerCase();
  const type = clean(page.pageType).toLowerCase();

  if (page.published === true) score += 100;
  if (page.status === "published") score += 80;

  if (slug === "") score += 70;
  if (slug === "home") score += 60;
  if (slug === "accueil") score += 60;

  if (path === "/" || path.endsWith("/")) score += 50;

  if (type === "home" || type === "homepage") score += 80;

  return score;
}

function mergeSection(current, patch) {
  const next = {
    ...(current || {}),
  };

  for (const [key, value] of Object.entries(patch || {})) {
    /*
     * Preserve the current schema. "paragraph" is used by the generic
     * agency-introduction sections while "text" is used by rich-text.
     */
    if (
      key === "paragraph" &&
      !Object.prototype.hasOwnProperty.call(next, "paragraph") &&
      Object.prototype.hasOwnProperty.call(next, "text")
    ) {
      next.text = value;
      continue;
    }

    next[key] = value;
  }

  return next;
}

async function resolveTarget(slug) {
  const site = await prisma.agencySite.findFirst({
    where: { slug },
    include: {
      agency: true,
      pages: {
        include: {
          sections: {
            orderBy: {
              displayOrder: "asc",
            },
          },
        },
      },
    },
  });

  if (!site) throw new Error(`SITE_NOT_FOUND:${slug}`);

  const candidates = [...site.pages]
    .map((page) => ({
      page,
      score: homeScore(page),
    }))
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) {
    throw new Error(`PAGE_NOT_FOUND:${slug}`);
  }

  if (candidates[0].score < 300) {
    throw new Error(
      `HOME_NOT_CONFIDENT:${slug}:${candidates[0].score}`
    );
  }

  return {
    site,
    page: candidates[0].page,
    score: candidates[0].score,
  };
}

async function buildPlan() {
  const result = [];

  for (const [slug, plan] of Object.entries(PLANS)) {
    const { site, page, score } = await resolveTarget(slug);

    let section = null;
    let nextSection = null;

    if (plan.content) {
      section =
        page.sections.find(
          (item) =>
            item.sectionType === plan.content.sectionType ||
            clean(item.jsonContent?.__builderType) ===
              plan.content.sectionType
        ) || null;

      if (!section) {
        throw new Error(
          `SECTION_NOT_FOUND:${slug}:${plan.content.sectionType}`
        );
      }

      nextSection = mergeSection(
        section.jsonContent,
        plan.content.patch
      );
    }

    result.push({
      slug,
      siteId: site.id,
      agencyId: site.agency?.id ?? null,
      pageId: page.id,
      pageScore: score,

      metadata: plan.metadata
        ? {
            before: {
              seoTitle: page.seoTitle ?? null,
              metaDescription: page.metaDescription ?? null,
            },
            after: {
              seoTitle: plan.metadata.seoTitle,
              metaDescription: plan.metadata.metaDescription,
            },
          }
        : null,

      section: section
        ? {
            id: section.id,
            type: section.sectionType,
            before: section.jsonContent,
            after: nextSection,
            fingerprint: fingerprint(section.jsonContent),
          }
        : null,

      pageFingerprint: fingerprint({
        seoTitle: page.seoTitle ?? null,
        metaDescription: page.metaDescription ?? null,
      }),
    });
  }

  return result;
}

async function applyPlan(plan) {
  return prisma.$transaction(
    async (tx) => {
      const applied = [];

      for (const item of plan) {
        const currentPage = await tx.agencySitePage.findUnique({
          where: {
            id: item.pageId,
          },
        });

        if (!currentPage) {
          throw new Error(`PAGE_DISAPPEARED:${item.slug}`);
        }

        const currentPageFingerprint = fingerprint({
          seoTitle: currentPage.seoTitle ?? null,
          metaDescription: currentPage.metaDescription ?? null,
        });

        if (currentPageFingerprint !== item.pageFingerprint) {
          throw new Error(
            `PAGE_CHANGED_SINCE_PREVIEW:${item.slug}`
          );
        }

        if (item.metadata) {
          await tx.agencySitePage.update({
            where: {
              id: item.pageId,
            },
            data: {
              seoTitle: item.metadata.after.seoTitle,
              metaDescription:
                item.metadata.after.metaDescription,
            },
          });
        }

        if (item.section) {
          const currentSection =
            await tx.agencySiteSection.findUnique({
              where: {
                id: item.section.id,
              },
            });

          if (!currentSection) {
            throw new Error(
              `SECTION_DISAPPEARED:${item.slug}`
            );
          }

          if (
            fingerprint(currentSection.jsonContent) !==
            item.section.fingerprint
          ) {
            throw new Error(
              `SECTION_CHANGED_SINCE_PREVIEW:${item.slug}`
            );
          }

          await tx.agencySiteSection.update({
            where: {
              id: item.section.id,
            },
            data: {
              jsonContent: item.section.after,
            },
          });
        }

        applied.push({
          slug: item.slug,
          pageId: item.pageId,
          metadataChanged: Boolean(item.metadata),
          contentChanged: Boolean(item.section),
        });
      }

      return applied;
    },
    {
      maxWait: 10000,
      timeout: 30000,
    }
  );
}

async function verify(plan) {
  const verification = [];

  for (const expected of plan) {
    const page = await prisma.agencySitePage.findUnique({
      where: {
        id: expected.pageId,
      },
      include: {
        sections: true,
      },
    });

    const metadataOk =
      !expected.metadata ||
      (
        page.seoTitle === expected.metadata.after.seoTitle &&
        page.metaDescription ===
          expected.metadata.after.metaDescription
      );

    const section = expected.section
      ? page.sections.find(
          (s) => s.id === expected.section.id
        )
      : null;

    const contentOk =
      !expected.section ||
      fingerprint(section?.jsonContent) ===
        fingerprint(expected.section.after);

    verification.push({
      slug: expected.slug,
      metadataOk,
      contentOk,
      ok: metadataOk && contentOk,
    });
  }

  return verification;
}

async function main() {
  const plan = await buildPlan();

  const report = {
    ticket: "MSE-25.240",
    mode: APPLY ? "APPLY" : "DRY_RUN",
    generatedAt: new Date().toISOString(),
    plan,
    applied: [],
    verification: [],
  };

  if (!APPLY) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  /*
   * The plan itself is the rollback snapshot because every changed value
   * contains an exact "before".
   */
  report.applied = await applyPlan(plan);
  report.verification = await verify(plan);

  if (!report.verification.every((item) => item.ok)) {
    throw new Error("POST_APPLY_VERIFICATION_FAILED");
  }

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
