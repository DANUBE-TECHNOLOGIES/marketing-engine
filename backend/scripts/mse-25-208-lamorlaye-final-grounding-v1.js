"use strict";

const crypto = require("crypto");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TICKET = "MSE-25.208";

const SITE_ID = "cms8n8jdu00j7n91axodw128b";
const AGENCY_ID = 7;

const HOME_PAGE_ID = "cms8n8jen00j9n91a25i1tspp";
const AGENCY_PAGE_ID = "cms8n8ktg00jnn91avfhcvhjn";
const PARTNERS_PAGE_ID = "cms8n8my200kjn91a7p89a4v6";

const HOME_TEAM_BLOCK_ID = "cmsztn4io00hntdhdomq7iobf";
const HOME_FAQ_BLOCK_ID = "cmsztn4io00hqtdhdt0ljg243";

const AGENCY_TEXT_BLOCK_ID = "cmsxhfhrs00dop11adt4w3ze6";
const AGENCY_TEAM_BLOCK_ID = "cmsxhfhrs00dqp11ai52osmv6";
const AGENCY_LOGOS_BLOCK_ID = "cmsxhfhrs00drp11aaze0v3ea";

const PARTNERS_HERO_BLOCK_ID = "cmsztn4m400i4tdhdvatln1ux";
const PARTNERS_TEXT_BLOCK_ID = "cmsztn4m400i5tdhdzot3x96d";
const PARTNERS_LOGOS_BLOCK_ID = "cmsztn4m400i6tdhd1z398m2t";
const PARTNERS_CTA_BLOCK_ID = "cmsztn4m400i7tdhdq4j3ox2w";
const PARTNERS_EDITORIAL_BLOCK_ID = "cmsztn4m400i8tdhdyvdyi1eg";

const PARTNER_DIRECTORY_SECTION_ID = "cmt16t60i0014mo1a2667hg9c";

const STEPHANIE_ASSET_ID = "cmsrqxgrr000kmn1a8d2q83va";

const SNAPSHOT_PATH =
  "/var/tmp/mse-25-208-lamorlaye-final-grounding-v1.snapshot.json";

const CANONICAL_CONTACT =
  "/agence/mondescale-lamorlaye/contact";

const CANONICAL_SERVICES =
  "/agence/mondescale-lamorlaye/services";

const TARGET_BLOCK_IDS = new Set([
  HOME_FAQ_BLOCK_ID,

  AGENCY_TEXT_BLOCK_ID,
  AGENCY_TEAM_BLOCK_ID,
  AGENCY_LOGOS_BLOCK_ID,

  PARTNERS_HERO_BLOCK_ID,
  PARTNERS_TEXT_BLOCK_ID,
  PARTNERS_LOGOS_BLOCK_ID,
  PARTNERS_CTA_BLOCK_ID,
  PARTNERS_EDITORIAL_BLOCK_ID
]);

const EXPECTED_PARTNERS_PAGE = {
  seoTitle:
    "Partenaires voyage à Lamorlaye | Mondescale Lamorlaye",

  metaDescription:
    "Découvrez les tour-opérateurs, croisiéristes et spécialistes sélectionnés par Mondescale Lamorlaye à Lamorlaye pour construire votre prochain voyage.",

  h1:
    "Nos partenaires de voyage à Lamorlaye"
};

const DESIRED_PARTNERS_PAGE = {
  seoTitle:
    "Voyagistes & partenaires | Mondescale Lamorlaye",

  metaDescription:
    "Découvrez les voyagistes et partenaires référencés par Mondescale. À Lamorlaye, Stéphanie vous aide à comparer les solutions adaptées à votre projet.",

  h1:
    "Voyagistes et partenaires de votre agence à Lamorlaye"
};

const DESIRED_HOME_FAQ = {
  title:
    "Questions fréquentes sur votre agence de voyages à Lamorlaye",

  items: [
    {
      question:
        "Pourquoi faire appel à une agence de voyages à Lamorlaye ?",

      answer:
        "À Lamorlaye, Stéphanie vous aide à comparer les solutions disponibles, à comprendre les prestations et conditions proposées et à préparer votre voyage avec un interlocuteur identifié."
    },

    {
      question:
        "Comment préparer un devis avec votre agence ?",

      answer:
        "Vous pouvez contacter Mondescale Lamorlaye en agence, par téléphone ou depuis la page Contact. Stéphanie étudie votre destination, vos dates, votre budget et votre façon de voyager avant de rechercher les solutions adaptées."
    },

    {
      question:
        "L’agence peut-elle adapter le projet à mon budget ?",

      answer:
        "Oui. Le budget fait partie des critères étudiés avec vous, au même titre que les dates, la destination, la durée, le transport, l’hébergement et les prestations souhaitées."
    }
  ]
};

const DESIRED_PARTNERS_EDITORIAL = {
  title:
    "Comment votre agence de Lamorlaye utilise ce réseau de partenaires",

  alignment:
    "left",

  html:
    "<p>Le catalogue présenté sur cette page rassemble les voyagistes et partenaires actuellement publiés par Mondescale. Il permet d’illustrer la diversité des solutions que Stéphanie peut étudier depuis l’agence de Lamorlaye : séjours et clubs, circuits accompagnés, croisières, voyages sur mesure, long-courriers ou vacances en France et en Europe.</p>" +
    "<p>Pour chaque projet, l’agence ne se limite pas à une marque. Stéphanie compare les propositions pertinentes selon votre destination, vos dates, votre budget, le rythme du voyage et les prestations recherchées. Les partenaires réellement étudiés dépendent donc de votre dossier, des disponibilités et des offres accessibles au moment de la recherche.</p>"
};

function stable(value) {
  if (Array.isArray(value)) {
    return value.map(stable);
  }

  if (
    value &&
    typeof value === "object" &&
    !(value instanceof Date)
  ) {
    return Object.keys(value)
      .sort()
      .reduce((out, key) => {
        out[key] = stable(value[key]);
        return out;
      }, {});
  }

  return value;
}

function hash(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stable(value)))
    .digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function comparableBlock(block) {
  const base = {
    id: block.id,
    pageId: block.pageId,
    blockType: block.blockType,
    name: block.name,
    displayOrder: block.displayOrder,
    status: block.status
  };

  if (!TARGET_BLOCK_IDS.has(block.id)) {
    base.content = block.content;
    base.settings = block.settings;
    base.seo = block.seo;
    base.visibleDesktop = block.visibleDesktop;
    base.visibleMobile = block.visibleMobile;
    base.version = block.version;
  }

  return base;
}

function comparablePage(page) {
  const value = {
    id: page.id,
    siteId: page.siteId,
    parentId: page.parentId,
    title: page.title,
    slug: page.slug,
    path: page.path,
    pageType: page.pageType,
    menuTitle: page.menuTitle,
    menuLocation: page.menuLocation,
    displayOrder: page.displayOrder,
    schemaType: page.schemaType,
    status: page.status,
    published: page.published,

    blocks:
      [...page.blocks]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(comparableBlock),

    sections:
      [...page.sections]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(section => ({
          id: section.id,
          pageId: section.pageId,
          sectionType: section.sectionType,
          jsonContent: section.jsonContent,
          displayOrder: section.displayOrder,
          status: section.status
        }))
  };

  if (page.id !== PARTNERS_PAGE_ID) {
    value.seoTitle = page.seoTitle;
    value.metaDescription = page.metaDescription;
    value.h1 = page.h1;
  }

  return value;
}

async function loadState(client = prisma) {
  const [agency, pages] = await Promise.all([
    client.agency.findUnique({
      where: {
        id: AGENCY_ID
      }
    }),

    client.agencySitePage.findMany({
      where: {
        siteId: SITE_ID
      },
      include: {
        blocks: true,
        sections: true
      },
      orderBy: {
        displayOrder: "asc"
      }
    })
  ]);

  assert(agency, "Lamorlaye agency missing");

  return {
    agency,
    pages
  };
}

function pageById(state, id) {
  const page = state.pages.find(item => item.id === id);

  assert(
    page,
    `page ${id} missing`
  );

  return page;
}

function blockById(state, id) {
  for (const page of state.pages) {
    const block =
      page.blocks.find(item => item.id === id);

    if (block) {
      return block;
    }
  }

  throw new Error(`block ${id} missing`);
}

function sectionById(state, id) {
  for (const page of state.pages) {
    const section =
      page.sections.find(item => item.id === id);

    if (section) {
      return section;
    }
  }

  throw new Error(`section ${id} missing`);
}

function protectedFingerprint(state) {
  return hash({
    agency: {
      id: state.agency.id,
      tenantId: state.agency.tenantId,
      name: state.agency.name,
      city: state.agency.city,
      address: state.agency.address,
      postalCode: state.agency.postalCode,
      phone: state.agency.phone,
      email: state.agency.email,
      website: state.agency.website,
      googleReviewUrl: state.agency.googleReviewUrl,
      googleLocationId: state.agency.googleLocationId
    },

    pages:
      state.pages.map(comparablePage)
  });
}

function assertPreconditions(state) {
  const homePage =
    pageById(state, HOME_PAGE_ID);

  const agencyPage =
    pageById(state, AGENCY_PAGE_ID);

  const partnersPage =
    pageById(state, PARTNERS_PAGE_ID);

  assert(
    homePage.slug === "home",
    "Home page identity changed"
  );

  assert(
    agencyPage.slug === "agence",
    "Agency page identity changed"
  );

  assert(
    partnersPage.slug === "partenaires",
    "Partners page identity changed"
  );

  assert(
    partnersPage.seoTitle ===
      EXPECTED_PARTNERS_PAGE.seoTitle &&
    partnersPage.metaDescription ===
      EXPECTED_PARTNERS_PAGE.metaDescription &&
    partnersPage.h1 ===
      EXPECTED_PARTNERS_PAGE.h1,
    "Partners page SEO precondition changed"
  );

  const canonicalTeam =
    blockById(state, HOME_TEAM_BLOCK_ID);

  assert(
    canonicalTeam.blockType === "team" &&
    canonicalTeam.status === "published" &&
    canonicalTeam.visibleDesktop === true &&
    canonicalTeam.visibleMobile === true,
    "Canonical Home Team block invalid"
  );

  const member =
    canonicalTeam.content?.members?.[0];

  assert(
    member?.name === "Stéphanie",
    "Canonical Stephanie name missing"
  );

  assert(
    member?.role === "Conseillère voyage",
    "Canonical Stephanie role missing"
  );

  assert(
    member?.imageAssetId === STEPHANIE_ASSET_ID,
    "Canonical Stephanie media changed"
  );

  const homeFaq =
    blockById(state, HOME_FAQ_BLOCK_ID);

  assert(
    homeFaq.blockType === "faq" &&
    homeFaq.version === 1 &&
    homeFaq.visibleDesktop === true &&
    homeFaq.visibleMobile === true &&
    homeFaq.content?.items?.[0]?.question ===
      "Pourquoi passer par une agence pour accueil ?",
    "Home FAQ precondition changed"
  );

  const agencyText =
    blockById(state, AGENCY_TEXT_BLOCK_ID);

  assert(
    agencyText.blockType === "text" &&
    agencyText.version === 1 &&
    agencyText.visibleDesktop === true &&
    agencyText.visibleMobile === true,
    "Agency generic text precondition changed"
  );

  const agencyTeam =
    blockById(state, AGENCY_TEAM_BLOCK_ID);

  assert(
    agencyTeam.blockType === "team" &&
    agencyTeam.version === 1 &&
    agencyTeam.content?.members?.[0]?.name ===
      "Votre équipe" &&
    agencyTeam.content?.members?.[0]?.role ===
      "Conseillers voyages",
    "Agency placeholder Team precondition changed"
  );

  const agencyLogos =
    blockById(state, AGENCY_LOGOS_BLOCK_ID);

  assert(
    agencyLogos.blockType === "logos" &&
    agencyLogos.version === 1 &&
    agencyLogos.visibleDesktop === true &&
    agencyLogos.visibleMobile === true,
    "Agency partner block precondition changed"
  );

  const partnerText =
    blockById(state, PARTNERS_TEXT_BLOCK_ID);

  assert(
    partnerText.blockType === "text" &&
    partnerText.version === 1 &&
    partnerText.visibleDesktop === true &&
    partnerText.visibleMobile === true,
    "Partners generic text precondition changed"
  );

  const partnerLogos =
    blockById(state, PARTNERS_LOGOS_BLOCK_ID);

  assert(
    partnerLogos.blockType === "logos" &&
    partnerLogos.version === 1 &&
    partnerLogos.visibleDesktop === true &&
    partnerLogos.visibleMobile === true,
    "Partners legacy logos precondition changed"
  );

  const directory =
    sectionById(
      state,
      PARTNER_DIRECTORY_SECTION_ID
    );

  assert(
    directory.sectionType ===
      "partner-directory" &&
    directory.jsonContent?.__builderType ===
      "partner-directory",
    "Partner directory contract missing"
  );

  return true;
}

function buildDesiredAgencyTeam(state) {
  const canonical =
    clone(
      blockById(
        state,
        HOME_TEAM_BLOCK_ID
      ).content
    );

  const member =
    clone(canonical.members[0]);

  // The long presentation already belongs to the canonical
  // profile/hydrator. The Agency block stores the concise
  // identity/media contract only.
  delete member.presentation;

  return {
    title:
      "Stéphanie, votre conseillère voyage à Lamorlaye",

    text:
      "Un interlocuteur identifié pour préparer et suivre votre projet de voyage.",

    members: [
      member
    ]
  };
}

function snapshotPayload(state) {
  const partnersPage =
    pageById(state, PARTNERS_PAGE_ID);

  return {
    ticket: TICKET,
    createdAt: new Date().toISOString(),
    siteId: SITE_ID,

    page: {
      id: partnersPage.id,
      seoTitle: partnersPage.seoTitle,
      metaDescription:
        partnersPage.metaDescription,
      h1: partnersPage.h1
    },

    blocks:
      [...TARGET_BLOCK_IDS]
        .map(id => {
          const block =
            blockById(state, id);

          return {
            id: block.id,
            pageId: block.pageId,
            content: block.content,
            visibleDesktop:
              block.visibleDesktop,
            visibleMobile:
              block.visibleMobile,
            version: block.version
          };
        }),

    protectedFingerprint:
      protectedFingerprint(state)
  };
}

async function rollback() {
  assert(
    fs.existsSync(SNAPSHOT_PATH),
    `rollback snapshot missing: ${SNAPSHOT_PATH}`
  );

  const snapshot =
    JSON.parse(
      fs.readFileSync(
        SNAPSHOT_PATH,
        "utf8"
      )
    );

  assert(
    snapshot.ticket === TICKET,
    "snapshot ticket mismatch"
  );

  await prisma.$transaction(
    async tx => {
      await tx.agencySitePage.update({
        where: {
          id: snapshot.page.id
        },
        data: {
          seoTitle:
            snapshot.page.seoTitle,
          metaDescription:
            snapshot.page.metaDescription,
          h1:
            snapshot.page.h1
        }
      });

      for (const block of snapshot.blocks) {
        await tx.pageBlock.update({
          where: {
            id: block.id
          },
          data: {
            content: block.content,
            visibleDesktop:
              block.visibleDesktop,
            visibleMobile:
              block.visibleMobile,
            version:
              block.version
          }
        });
      }
    }
  );

  console.log(
    JSON.stringify({
      ticket: TICKET,
      mode: "ROLLBACK",
      restored: true,
      snapshot: SNAPSHOT_PATH
    }, null, 2)
  );
}

async function apply() {
  const before =
    await loadState();

  assertPreconditions(before);

  const fingerprintBefore =
    protectedFingerprint(before);

  const desiredAgencyTeam =
    buildDesiredAgencyTeam(before);

  const report = {
    ticket: TICKET,
    siteId: SITE_ID,
    agencyId: AGENCY_ID,
    mode:
      process.env.MSE_25_208_CONFIRM ===
        "true"
        ? "APPLY"
        : "DRY_RUN",

    protectedFingerprintBefore:
      fingerprintBefore,

    mutations: {
      pageSeoWrites: 1,
      blockUpdates: 9,
      sectionWrites: 0,
      agencyWrites: 0,
      routingWrites: 0,
      catalogWrites: 0
    },

    desired: {
      homeFaq:
        DESIRED_HOME_FAQ,

      agencyTeam:
        desiredAgencyTeam,

      partnersPage:
        DESIRED_PARTNERS_PAGE,

      partnersEditorial:
        DESIRED_PARTNERS_EDITORIAL
    }
  };

  if (
    process.env.MSE_25_208_CONFIRM !==
      "true"
  ) {
    console.log(
      JSON.stringify(
        {
          ...report,
          mutationPerformed: false
        },
        null,
        2
      )
    );

    return;
  }

  assert(
    !fs.existsSync(SNAPSHOT_PATH),
    `snapshot already exists: ${SNAPSHOT_PATH}`
  );

  fs.writeFileSync(
    SNAPSHOT_PATH,
    JSON.stringify(
      snapshotPayload(before),
      null,
      2
    ),
    {
      mode: 0o600
    }
  );

  await prisma.$transaction(
    async tx => {
      await tx.pageBlock.update({
        where: {
          id: HOME_FAQ_BLOCK_ID
        },
        data: {
          content:
            DESIRED_HOME_FAQ,
          version: 2
        }
      });

      await tx.pageBlock.update({
        where: {
          id: AGENCY_TEXT_BLOCK_ID
        },
        data: {
          visibleDesktop: false,
          visibleMobile: false,
          version: 2
        }
      });

      await tx.pageBlock.update({
        where: {
          id: AGENCY_TEAM_BLOCK_ID
        },
        data: {
          content:
            desiredAgencyTeam,
          visibleDesktop: true,
          visibleMobile: true,
          version: 2
        }
      });

      await tx.pageBlock.update({
        where: {
          id: AGENCY_LOGOS_BLOCK_ID
        },
        data: {
          visibleDesktop: false,
          visibleMobile: false,
          version: 2
        }
      });

      await tx.agencySitePage.update({
        where: {
          id: PARTNERS_PAGE_ID
        },
        data: {
          seoTitle:
            DESIRED_PARTNERS_PAGE.seoTitle,

          metaDescription:
            DESIRED_PARTNERS_PAGE.metaDescription,

          h1:
            DESIRED_PARTNERS_PAGE.h1
        }
      });

      await tx.pageBlock.update({
        where: {
          id: PARTNERS_HERO_BLOCK_ID
        },
        data: {
          content: {
            title:
              "Voyagistes et partenaires de votre agence à Lamorlaye",

            eyebrow:
              "MONDESCALE",

            imageAlt: null,
            imageUrl: null,

            subtitle:
              "Un réseau de voyagistes et spécialistes pour comparer les solutions adaptées à votre projet.",

            alignment:
              "left",

            primaryCta: null,
            imageAssetId: null,
            secondaryCta: null
          },

          version: 2
        }
      });

      await tx.pageBlock.update({
        where: {
          id: PARTNERS_TEXT_BLOCK_ID
        },
        data: {
          visibleDesktop: false,
          visibleMobile: false,
          version: 2
        }
      });

      await tx.pageBlock.update({
        where: {
          id: PARTNERS_LOGOS_BLOCK_ID
        },
        data: {
          content: {
            title:
              "Voyagistes et partenaires référencés",

            text:
              "Le catalogue ci-dessous présente les partenaires actuellement publiés par Mondescale. Stéphanie vous aide à identifier ceux qui correspondent aux critères de votre projet."
          },

          visibleDesktop: true,
          visibleMobile: true,
          version: 2
        }
      });

      await tx.pageBlock.update({
        where: {
          id: PARTNERS_CTA_BLOCK_ID
        },
        data: {
          content: {
            title:
              "Parlons de votre prochain voyage",

            text:
              "Vous avez une destination ou un type de voyage en tête ? Stéphanie peut comparer avec vous les solutions proposées par les partenaires référencés.",

            style:
              "primary",

            primaryCta: {
              href:
                CANONICAL_CONTACT,
              label:
                "Contacter l’agence"
            },

            secondaryCta: {
              href:
                CANONICAL_SERVICES,
              label:
                "Découvrir nos services"
            }
          },

          version: 2
        }
      });

      await tx.pageBlock.update({
        where: {
          id:
            PARTNERS_EDITORIAL_BLOCK_ID
        },
        data: {
          content:
            DESIRED_PARTNERS_EDITORIAL,
          version: 2
        }
      });
    }
  );

  const after =
    await loadState();

  const fingerprintAfter =
    protectedFingerprint(after);

  assert(
    fingerprintAfter ===
      fingerprintBefore,
    "protected Lamorlaye state changed"
  );

  const afterFaq =
    blockById(
      after,
      HOME_FAQ_BLOCK_ID
    );

  assert(
    afterFaq.version === 2 &&
    afterFaq.content?.items?.[0]?.question ===
      DESIRED_HOME_FAQ.items[0].question,
    "Home FAQ final state invalid"
  );

  const afterAgencyText =
    blockById(
      after,
      AGENCY_TEXT_BLOCK_ID
    );

  assert(
    afterAgencyText.visibleDesktop ===
      false &&
    afterAgencyText.visibleMobile ===
      false,
    "Agency generic text still visible"
  );

  const afterAgencyTeam =
    blockById(
      after,
      AGENCY_TEAM_BLOCK_ID
    );

  assert(
    afterAgencyTeam.version === 2 &&
    afterAgencyTeam.content?.members?.[0]?.name ===
      "Stéphanie" &&
    afterAgencyTeam.content?.members?.[0]?.imageAssetId ===
      STEPHANIE_ASSET_ID &&
    !afterAgencyTeam.content?.members?.[0]?.presentation,
    "Agency Stephanie projection invalid"
  );

  const afterAgencyLogos =
    blockById(
      after,
      AGENCY_LOGOS_BLOCK_ID
    );

  assert(
    afterAgencyLogos.visibleDesktop ===
      false &&
    afterAgencyLogos.visibleMobile ===
      false,
    "Agency duplicate partner catalog still visible"
  );

  const afterPartners =
    pageById(
      after,
      PARTNERS_PAGE_ID
    );

  assert(
    afterPartners.seoTitle ===
      DESIRED_PARTNERS_PAGE.seoTitle &&
    afterPartners.metaDescription ===
      DESIRED_PARTNERS_PAGE.metaDescription &&
    afterPartners.h1 ===
      DESIRED_PARTNERS_PAGE.h1,
    "Partners page metadata invalid"
  );

  assert(
    blockById(
      after,
      PARTNERS_TEXT_BLOCK_ID
    ).visibleDesktop === false &&
    blockById(
      after,
      PARTNERS_TEXT_BLOCK_ID
    ).visibleMobile === false,
    "Partners generic text still visible"
  );

  assert(
    blockById(
      after,
      PARTNERS_LOGOS_BLOCK_ID
    ).visibleDesktop === true &&
    blockById(
      after,
      PARTNERS_LOGOS_BLOCK_ID
    ).visibleMobile === true,
    "Partners directory trigger is not visible"
  );

  const directoryAfter =
    sectionById(
      after,
      PARTNER_DIRECTORY_SECTION_ID
    );

  assert(
    directoryAfter.jsonContent?.__builderType ===
      "partner-directory",
    "Partner directory changed"
  );

  console.log(
    JSON.stringify({
      ...report,

      mutationPerformed: true,

      snapshot:
        SNAPSHOT_PATH,

      protectedFingerprintAfter:
        fingerprintAfter,

      protectedUnchanged:
        fingerprintAfter ===
          fingerprintBefore,

      finalState: {
        homeFaq:
          afterFaq.content,

        agencyProfile: {
          member:
            afterAgencyTeam.content
              ?.members?.[0],

          duplicateCatalogVisible:
            afterAgencyLogos
              .visibleDesktop ||
            afterAgencyLogos
              .visibleMobile
        },

        partners: {
          seoTitle:
            afterPartners.seoTitle,

          metaDescription:
            afterPartners
              .metaDescription,

          h1:
            afterPartners.h1,

          genericTextVisible:
            blockById(
              after,
              PARTNERS_TEXT_BLOCK_ID
            ).visibleDesktop ||
            blockById(
              after,
              PARTNERS_TEXT_BLOCK_ID
            ).visibleMobile,

          directoryTriggerVisible:
            blockById(
              after,
              PARTNERS_LOGOS_BLOCK_ID
            ).visibleDesktop &&
            blockById(
              after,
              PARTNERS_LOGOS_BLOCK_ID
            ).visibleMobile,

          directoryPreserved:
            true
        }
      }
    }, null, 2)
  );
}

(async () => {
  if (
    process.argv.includes("--rollback")
  ) {
    await rollback();
  } else {
    await apply();
  }
})()
.catch(error => {
  console.error(error);
  process.exitCode = 1;
})
.finally(
  () => prisma.$disconnect()
);
