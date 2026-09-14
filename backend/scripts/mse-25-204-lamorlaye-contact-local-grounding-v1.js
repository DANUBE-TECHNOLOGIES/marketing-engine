const crypto = require("node:crypto");
const fs = require("node:fs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SITE_ID = "cms8n8jdu00j7n91axodw128b";
const PAGE_ID = "cms8n8oeu00m5n91awt8asqjd";
const SITE_SLUG = "mondescale-lamorlaye";

const EDITORIAL_NAME = "lamorlaye-contact-editorial-v1";
const SNAPSHOT =
  "/var/tmp/mse-25-204-lamorlaye-contact-local-grounding-v1.snapshot.json";

const TARGET = Object.freeze({
  title: "Contactez votre agence de voyages à Lamorlaye",
  seoTitle: "Contact & accès | Agence Mondescale Lamorlaye",
  metaDescription:
    "Contactez Mondescale Lamorlaye : téléphone, horaires, accès et informations pratiques pour préparer votre projet de voyage avec Stéphanie.",
  h1: "Contactez votre agence de voyages à Lamorlaye",
  editorialTitle: "Votre agence de voyages à Lamorlaye et ses environs",
  editorialHtml:
    "<p>Besoin d’un conseil, d’un devis ou envie d’échanger sur votre prochain voyage ? Stéphanie vous accueille chez Mondescale Lamorlaye pour vos projets de séjours, circuits, croisières, voyages sur mesure et billetterie.</p>" +
    "<p>Vous avez déjà une destination en tête ou vous hésitez encore ? Un échange en agence permet de préciser vos priorités, votre budget et les prestations importantes pour vous afin de comparer les solutions disponibles pour votre projet.</p>"
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])])
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

async function readState() {
  const site = await prisma.agencySite.findUnique({
    where: { id: SITE_ID },
    include: {
      agency: true,
      pages: {
        include: {
          blocks: {
            orderBy: [
              { displayOrder: "asc" },
              { id: "asc" }
            ]
          }
        },
        orderBy: [
          { displayOrder: "asc" },
          { id: "asc" }
        ]
      }
    }
  });

  if (!site) throw new Error("Lamorlaye site not found");
  if (site.slug !== SITE_SLUG) {
    throw new Error(`Unexpected site slug: ${site.slug}`);
  }

  const contact = site.pages.find((p) => p.id === PAGE_ID);

  if (!contact || contact.slug !== "contact") {
    throw new Error("Exact Lamorlaye Contact page not found");
  }

  return { site, contact };
}

function protectedShape(state) {
  return {
    routes: state.site.pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      path: p.path,
      pageType: p.pageType,
      menuTitle: p.menuTitle,
      menuLocation: p.menuLocation,
      displayOrder: p.displayOrder,
      status: p.status,
      published: p.published
    })),
    nonContact: state.site.pages
      .filter((p) => p.id !== PAGE_ID)
      .map((p) => ({
        id: p.id,
        title: p.title,
        seoTitle: p.seoTitle,
        metaDescription: p.metaDescription,
        h1: p.h1,
        updatedAt: p.updatedAt,
        blocks: p.blocks
      })),
    agency: {
      id: state.site.agency.id,
      name: state.site.agency.name,
      city: state.site.agency.city,
      address: state.site.agency.address,
      postalCode: state.site.agency.postalCode,
      phone: state.site.agency.phone,
      email: state.site.agency.email,
      website: state.site.agency.website,
      googleReviewUrl: state.site.agency.googleReviewUrl
    }
  };
}

async function main() {
  const rollback = process.env.MSE_25_204_ROLLBACK === "true";
  const apply = process.env.MSE_25_204_CONFIRM === "true";

  if (rollback) {
    if (!fs.existsSync(SNAPSHOT)) {
      throw new Error(`Snapshot missing: ${SNAPSHOT}`);
    }

    const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, "utf8"));

    await prisma.$transaction(async (tx) => {
      await tx.agencySitePage.update({
        where: { id: PAGE_ID },
        data: {
          title: snapshot.contact.title,
          seoTitle: snapshot.contact.seoTitle,
          metaDescription: snapshot.contact.metaDescription,
          h1: snapshot.contact.h1
        }
      });

      for (const block of snapshot.contact.blocks) {
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

    console.log("PASS: rollback complete");
    return;
  }

  const before = await readState();

  const editorial = before.contact.blocks.filter(
    (b) => b.blockType === "rich_text" && b.name === EDITORIAL_NAME
  );

  if (editorial.length !== 1) {
    throw new Error(
      `Expected exactly one ${EDITORIAL_NAME}, found ${editorial.length}`
    );
  }

  const legacyPublishedRichText = before.contact.blocks.filter(
    (b) =>
      b.blockType === "rich_text" &&
      b.id !== editorial[0].id &&
      b.status === "published"
  );

  if (legacyPublishedRichText.length !== 1) {
    throw new Error(
      `Expected exactly one legacy published rich_text, found ${legacyPublishedRichText.length}`
    );
  }

  const protectedBefore = protectedShape(before);
  const protectedFingerprintBefore = fingerprint(protectedBefore);

  const snapshot = {
    createdAt: new Date().toISOString(),
    siteId: SITE_ID,
    pageId: PAGE_ID,
    protectedFingerprintBefore,
    contact: {
      title: before.contact.title,
      seoTitle: before.contact.seoTitle,
      metaDescription: before.contact.metaDescription,
      h1: before.contact.h1,
      blocks: before.contact.blocks.map((b) => ({
        id: b.id,
        content: b.content,
        status: b.status,
        visibleDesktop: b.visibleDesktop,
        visibleMobile: b.visibleMobile,
        version: b.version
      }))
    }
  };

  const plan = {
    mode: apply ? "APPLY" : "DRY_RUN",
    target: {
      siteId: SITE_ID,
      pageId: PAGE_ID,
      slug: "contact"
    },
    page: {
      before: {
        title: before.contact.title,
        seoTitle: before.contact.seoTitle,
        metaDescription: before.contact.metaDescription,
        h1: before.contact.h1
      },
      after: {
        title: TARGET.title,
        seoTitle: TARGET.seoTitle,
        metaDescription: TARGET.metaDescription,
        h1: TARGET.h1
      }
    },
    editorial: {
      id: editorial[0].id,
      before: editorial[0].content,
      after: {
        title: TARGET.editorialTitle,
        html: TARGET.editorialHtml
      }
    },
    legacyRichText: {
      id: legacyPublishedRichText[0].id,
      action: "published -> draft"
    },
    protectedFingerprintBefore
  };

  console.log(JSON.stringify(plan, null, 2));

  if (!apply) {
    console.log("PASS: DRY_RUN — no database write");
    return;
  }

  fs.writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2));

  await prisma.$transaction(async (tx) => {
    await tx.agencySitePage.update({
      where: { id: PAGE_ID },
      data: {
        title: TARGET.title,
        seoTitle: TARGET.seoTitle,
        metaDescription: TARGET.metaDescription,
        h1: TARGET.h1
      }
    });

    await tx.pageBlock.update({
      where: { id: editorial[0].id },
      data: {
        content: {
          title: TARGET.editorialTitle,
          html: TARGET.editorialHtml
        },
        status: "published",
        visibleDesktop: true,
        visibleMobile: true,
        version: { increment: 1 }
      }
    });

    await tx.pageBlock.update({
      where: { id: legacyPublishedRichText[0].id },
      data: {
        status: "draft",
        visibleDesktop: false,
        visibleMobile: false,
        version: { increment: 1 }
      }
    });
  });

  const after = await readState();
  const protectedFingerprintAfter = fingerprint(protectedShape(after));

  if (protectedFingerprintAfter !== protectedFingerprintBefore) {
    throw new Error(
      "POST-WRITE GUARD FAILED: protected Lamorlaye state changed"
    );
  }

  console.log(JSON.stringify({
    mode: "APPLY",
    snapshot: SNAPSHOT,
    protectedFingerprintBefore,
    protectedFingerprintAfter,
    protectedUnchanged:
      protectedFingerprintAfter === protectedFingerprintBefore
  }, null, 2));

  console.log("PASS: MSE-25.204 applied");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
