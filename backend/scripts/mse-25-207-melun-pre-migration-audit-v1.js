"use strict";

const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const TARGET_SITE_SLUG = process.env.MSE_25_207_SITE_SLUG || "tui-store-melun";
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = stable(value[key]);
        return acc;
      }, {});
  }
  return value;
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function pageShape(page) {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    path: page.path,
    pageType: page.pageType,
    status: page.status,
    published: page.published,
    seoTitle: page.seoTitle,
    metaDescription: page.metaDescription,
    h1: page.h1,
    schemaType: page.schemaType,
    blockCount: (page.blocks || []).length,
    blocks: (page.blocks || []).map((block) => ({
      id: block.id,
      name: block.name,
      blockType: block.blockType,
      status: block.status,
      visibleDesktop: block.visibleDesktop,
      visibleMobile: block.visibleMobile,
      displayOrder: block.displayOrder,
      version: block.version,
      contentKeys:
        block.content && typeof block.content === "object" && !Array.isArray(block.content)
          ? Object.keys(block.content).sort()
          : [],
    })),
  };
}

function publicTopologyFingerprint(site) {
  return hash({
    site: {
      id: site.id,
      slug: site.slug,
      basePath: site.basePath,
      status: site.status,
    },
    pages: (site.pages || []).map((page) => ({
      id: page.id,
      slug: page.slug,
      path: page.path,
      pageType: page.pageType,
      status: page.status,
      published: page.published,
      schemaType: page.schemaType,
      blocks: (page.blocks || []).map((block) => ({
        id: block.id,
        name: block.name,
        blockType: block.blockType,
        status: block.status,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        displayOrder: block.displayOrder,
      })),
    })),
  });
}

function identitySnapshot(site) {
  const agency = site.agency || {};
  return {
    agencyId: agency.id || null,
    siteId: site.id,
    siteSlug: site.slug,
    siteBasePath: site.basePath || null,
    agencyName: agency.name || null,
    city: agency.city || null,
    postalCode: agency.postalCode || null,
    address: agency.address || agency.addressLine1 || null,
    phone: agency.phone || null,
    email: agency.email || null,
    latitude: agency.latitude ?? null,
    longitude: agency.longitude ?? null,
  };
}

async function main() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`MSE-25.207: tenant introuvable: ${TENANT_SLUG}`);

  const site = await prisma.agencySite.findFirst({
    where: { tenantId: tenant.id, slug: TARGET_SITE_SLUG },
    include: {
      agency: true,
      pages: {
        include: { blocks: { orderBy: { displayOrder: "asc" } } },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!site) throw new Error(`MSE-25.207: site exact introuvable: ${TARGET_SITE_SLUG}`);
  if (normalize(site.agency?.city) !== "melun") {
    throw new Error(`MSE-25.207: garde-fou ville refusé: ${site.agency?.city || "absente"}`);
  }

  const serialized = JSON.stringify(site);
  const prematureBrandTokens = ["ambassade fram", "mondescale ambassade fram"];
  const prematureBrandHits = prematureBrandTokens.filter((token) =>
    normalize(serialized).includes(normalize(token))
  );

  const report = {
    contract: "MSE-25.207",
    mode: "READ_ONLY",
    target: TARGET_SITE_SLUG,
    tenant: TENANT_SLUG,
    identity: identitySnapshot(site),
    topologyFingerprint: publicTopologyFingerprint(site),
    pageCount: (site.pages || []).length,
    pages: (site.pages || []).map(pageShape),
    preMigrationGuards: {
      expectedCurrentSlug: TARGET_SITE_SLUG === "tui-store-melun",
      cityIsMelun: normalize(site.agency?.city) === "melun",
      noPrematureAmbassadeFramContent: prematureBrandHits.length === 0,
      prematureBrandHits,
      futureSlug: "ambassade-fram-mondescale-melun",
      mutationPerformed: false,
    },
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
