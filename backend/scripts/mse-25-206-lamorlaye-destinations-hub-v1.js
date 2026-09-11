const crypto = require("node:crypto");
const fs = require("node:fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SITE_ID = "cms8n8jdu00j7n91axodw128b";
const SITE_SLUG = "mondescale-lamorlaye";
const PAGE_ID = "cms8n8noo00l5n91au0gfhgl7";
const PAGE_SLUG = "destinations";

const TEXT_ID = "cmsw1f78m00yop11aiwti8ici";
const GRID_ID = "cmsw1f78m00ypp11a6wow7g0n";
const FAQ_ID = "cmsw1f78m00yqp11aldep9nb2";
const CTA_ID = "cmsw1f78m00yrp11albz34o3j";
const EDITORIAL_1_ID = "cmsw1f78m00ysp11aisjfq9ic";
const EDITORIAL_2_ID = "cmsw1f78m00ytp11aambteypa";

const SNAPSHOT =
  "/var/tmp/mse-25-206-lamorlaye-destinations-hub-v1.snapshot.json";

const DESIRED_PAGE = {
  title: "Nos destinations",
  seoTitle: "Destinations de voyage | Mondescale Lamorlaye",
  metaDescription:
    "Découvrez les destinations proposées par Mondescale Lamorlaye et choisissez votre prochain voyage selon la saison, la durée, votre budget et vos envies avec Stéphanie.",
  h1: "Où partir ? Les destinations de votre agence de Lamorlaye"
};

const DESIRED_GRID = {
  title: "Nos idées de destinations",
  subtitle:
    "Soleil, plages, découvertes ou dépaysement : explorez les destinations actuellement présentées par votre agence."
};

const DESIRED_EDITORIAL_1 = {
  title: "Choisir votre prochaine destination",
  html:
    "<p>Envie de soleil, de découverte, d’un circuit ou d’un grand voyage ? Mondescale Lamorlaye vous aide à choisir une destination en fonction de la saison, de la durée disponible, de votre budget et de votre façon de voyager.</p><p>Stéphanie peut également vous accompagner lorsque votre projet nécessite plusieurs étapes, un itinéraire personnalisé ou la comparaison de différentes formules.</p>",
  alignment: "left"
};

const DESIRED_EDITORIAL_2 = {
  title: "Du séjour au voyage sur mesure",
  html:
    "<p>Selon votre projet, une même destination peut se découvrir lors d’un séjour, d’un circuit, d’un autotour ou d’un itinéraire construit sur mesure. L’agence vous aide à comparer ces différentes façons de voyager en tenant compte des transports, du rythme souhaité et des prestations importantes pour vous.</p><p>Vous pouvez ensuite consulter les destinations actuellement présentées sur le site ou échanger avec Stéphanie pour étudier un projet qui n’y figure pas encore.</p>",
  alignment: "left"
};

const DESIRED_CTA = {
  title: "Parlons de votre prochain voyage",
  text:
    "Vous avez une destination en tête ou vous hésitez encore ? Échangez avec Stéphanie pour préciser votre projet et comparer les solutions disponibles.",
  style: "primary",
  primaryCta: {
    href: "/agence/mondescale-lamorlaye/contact",
    label: "Contacter l’agence"
  },
  secondaryCta: {
    href: "/agence/mondescale-lamorlaye/services",
    label: "Découvrir nos services"
  }
};

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);

  if (value && typeof value === "object" && value.constructor === Object) {
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
        orderBy: [{ displayOrder: "asc" }, { slug: "asc" }],
        include: {
          blocks: {
            orderBy: [{ displayOrder: "asc" }, { id: "asc" }]
          }
        }
      }
    }
  });

  if (!site || site.slug !== SITE_SLUG) {
    throw new Error("Unexpected Lamorlaye site");
  }

  const page = site.pages.find(candidate => candidate.id === PAGE_ID);

  if (
    !page ||
    page.slug !== PAGE_SLUG ||
    page.pageType !== "DESTINATIONS"
  ) {
    throw new Error("Unexpected Destinations hub");
  }

  const block = id => page.blocks.find(candidate => candidate.id === id);

  const text = block(TEXT_ID);
  const grid = block(GRID_ID);
  const faq = block(FAQ_ID);
  const cta = block(CTA_ID);
  const editorial1 = block(EDITORIAL_1_ID);
  const editorial2 = block(EDITORIAL_2_ID);

  for (const [name, value] of Object.entries({
    text, grid, faq, cta, editorial1, editorial2
  })) {
    if (!value) throw new Error(`Required ${name} block missing`);
  }

  if (grid.blockType !== "destination-grid") {
    throw new Error("Unexpected destination grid type");
  }

  if (
    editorial1.blockType !== "rich_text" ||
    editorial2.blockType !== "rich_text" ||
    editorial1.status !== "published" ||
    editorial2.status !== "published"
  ) {
    throw new Error("Unexpected editorial blocks");
  }

  const destinationItems = grid.content?.items;

  if (!Array.isArray(destinationItems) || destinationItems.length !== 6) {
    throw new Error("Expected exactly six existing destination references");
  }

  const destinationContract = destinationItems.map(item => ({
    title: item.title,
    href: item.href
  }));

  const protectedState = {
    agency: {
      id: site.agency?.id,
      name: site.agency?.name,
      city: site.agency?.city,
      address: site.agency?.address,
      postalCode: site.agency?.postalCode,
      phone: site.agency?.phone,
      email: site.agency?.email
    },

    routes: site.pages.map(candidate => ({
      id: candidate.id,
      slug: candidate.slug,
      path: candidate.path,
      pageType: candidate.pageType,
      status: candidate.status,
      published: candidate.published
    })),

    nonDestinationPages: site.pages
      .filter(candidate => candidate.id !== PAGE_ID)
      .map(candidate => ({
        id: candidate.id,
        title: candidate.title,
        seoTitle: candidate.seoTitle,
        metaDescription: candidate.metaDescription,
        h1: candidate.h1,
        blocks: candidate.blocks
      })),

    destinationContract
  };

  return {
    page,
    text,
    grid,
    faq,
    cta,
    editorial1,
    editorial2,
    destinationContract,
    protectedState,
    protectedFingerprint: fingerprint(protectedState)
  };
}

function snapshotFrom(state) {
  return {
    createdAt: new Date().toISOString(),
    siteId: SITE_ID,
    pageId: PAGE_ID,
    protectedFingerprintBefore: state.protectedFingerprint,

    page: {
      title: state.page.title,
      seoTitle: state.page.seoTitle,
      metaDescription: state.page.metaDescription,
      h1: state.page.h1
    },

    blocks: [
      state.text,
      state.grid,
      state.faq,
      state.cta,
      state.editorial1,
      state.editorial2
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
    throw new Error(`Missing snapshot: ${SNAPSHOT}`);
  }

  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));

  if (snapshot.siteId !== SITE_ID || snapshot.pageId !== PAGE_ID) {
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

  console.log("PASS: MSE-25.206 rollback restored snapshot");
}

async function apply() {
  const before = await loadState();

  if (!fs.existsSync(SNAPSHOT)) {
    fs.writeFileSync(
      SNAPSHOT,
      JSON.stringify(snapshotFrom(before), null, 2)
    );
  } else {
    console.log("INFO: existing snapshot preserved");
  }

  await prisma.$transaction(async tx => {
    await tx.agencySitePage.update({
      where: { id: PAGE_ID },
      data: DESIRED_PAGE
    });

    await tx.pageBlock.update({
      where: { id: GRID_ID },
      data: {
        content: {
          ...before.grid.content,
          ...DESIRED_GRID,
          items: before.grid.content.items
        },
        version: { increment: 1 }
      }
    });

    await tx.pageBlock.update({
      where: { id: TEXT_ID },
      data: {
        visibleDesktop: false,
        visibleMobile: false,
        version: { increment: 1 }
      }
    });

    await tx.pageBlock.update({
      where: { id: FAQ_ID },
      data: {
        visibleDesktop: false,
        visibleMobile: false,
        version: { increment: 1 }
      }
    });

    await tx.pageBlock.update({
      where: { id: CTA_ID },
      data: {
        content: DESIRED_CTA,
        version: { increment: 1 }
      }
    });

    await tx.pageBlock.update({
      where: { id: EDITORIAL_1_ID },
      data: {
        content: DESIRED_EDITORIAL_1,
        version: { increment: 1 }
      }
    });

    await tx.pageBlock.update({
      where: { id: EDITORIAL_2_ID },
      data: {
        content: DESIRED_EDITORIAL_2,
        version: { increment: 1 }
      }
    });
  });

  const after = await loadState();

  const protectedUnchanged =
    before.protectedFingerprint === after.protectedFingerprint;

  console.log(JSON.stringify({
    mode: "APPLY",
    protectedFingerprintBefore: before.protectedFingerprint,
    protectedFingerprintAfter: after.protectedFingerprint,
    protectedUnchanged,
    destinationContract: after.destinationContract,
    page: {
      seoTitle: after.page.seoTitle,
      metaDescription: after.page.metaDescription,
      h1: after.page.h1
    },
    visibility: {
      text: {
        desktop: after.text.visibleDesktop,
        mobile: after.text.visibleMobile
      },
      faq: {
        desktop: after.faq.visibleDesktop,
        mobile: after.faq.visibleMobile
      }
    },
    grid: after.grid.content,
    cta: after.cta.content,
    editorial1: after.editorial1.content,
    editorial2: after.editorial2.content
  }, null, 2));

  if (!protectedUnchanged) {
    throw new Error("Protected destination state changed");
  }

  console.log("PASS: MSE-25.206 applied");
}

async function dryRun() {
  const state = await loadState();

  console.log(JSON.stringify({
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
        metaDescription: state.page.metaDescription,
        h1: state.page.h1
      },
      destinationContract: state.destinationContract,
      text: {
        id: state.text.id,
        status: state.text.status,
        visibleDesktop: state.text.visibleDesktop,
        visibleMobile: state.text.visibleMobile,
        content: state.text.content
      },
      faq: {
        id: state.faq.id,
        status: state.faq.status,
        visibleDesktop: state.faq.visibleDesktop,
        visibleMobile: state.faq.visibleMobile,
        content: state.faq.content
      },
      grid: {
        id: state.grid.id,
        status: state.grid.status,
        content: state.grid.content
      },
      cta: {
        id: state.cta.id,
        status: state.cta.status,
        content: state.cta.content
      },
      editorial1: {
        id: state.editorial1.id,
        status: state.editorial1.status,
        content: state.editorial1.content
      },
      editorial2: {
        id: state.editorial2.id,
        status: state.editorial2.status,
        content: state.editorial2.content
      }
    },
    desired: {
      page: DESIRED_PAGE,
      grid: DESIRED_GRID,
      textVisibility: false,
      faqVisibility: false,
      cta: DESIRED_CTA,
      editorial1: DESIRED_EDITORIAL_1,
      editorial2: DESIRED_EDITORIAL_2
    },
    protectedFingerprint: state.protectedFingerprint,
    snapshot: SNAPSHOT
  }, null, 2));

  console.log("PASS: dry-run only — no database write");
}

(async () => {
  if (process.env.MSE_25_206_ROLLBACK === "true") {
    await rollback();
    return;
  }

  if (process.env.MSE_25_206_CONFIRM === "true") {
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
