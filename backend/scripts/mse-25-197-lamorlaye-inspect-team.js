"use strict";

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const TENANT_SLUG = process.env.TENANT_SLUG || "mondescale";
const SITE_SLUG = process.env.MSE_25_197_SITE_SLUG || "mondescale-lamorlaye";

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function imageUrl(value, trail = []) {
  if (!value) return [];
  if (typeof value === "string") {
    const v = value.trim();
    if (!v) return [];
    if (/^(https?:\/\/|\/media\/|\/uploads\/|\/assets\/)/i.test(v) || /\.(png|jpe?g|webp|avif|gif)(\?|$)/i.test(v)) {
      return [{ path: trail.join("."), value: v }];
    }
    return [];
  }
  if (Array.isArray(value)) return value.flatMap((item, index) => imageUrl(item, [...trail, String(index)]));
  if (typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => imageUrl(child, [...trail, key]));
}

function summarizeMember(member, index) {
  return {
    index,
    id: member?.id || null,
    name: member?.name || member?.title || null,
    role: member?.role || member?.jobTitle || member?.subtitle || null,
    imageCandidates: imageUrl(member),
    keys: member && typeof member === "object" ? Object.keys(member).sort() : [],
  };
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG }, select: { id: true, slug: true } });
  if (!tenant) throw new Error(`tenant introuvable: ${TENANT_SLUG}`);

  const site = await prisma.agencySite.findFirst({
    where: { tenantId: tenant.id, slug: SITE_SLUG },
    include: {
      agency: { select: { id: true, name: true, city: true } },
      pages: {
        orderBy: { displayOrder: "asc" },
        include: { blocks: { orderBy: { displayOrder: "asc" } } },
      },
    },
  });
  if (!site) throw new Error(`site introuvable: ${SITE_SLUG}`);
  if (normalize(site.agency?.city) !== "lamorlaye") throw new Error(`garde-fou ville: ${site.agency?.city || "absente"}`);

  const pages = site.pages.map((page) => ({
    slug: page.slug,
    title: page.title,
    published: page.published,
    blocks: page.blocks.map((block) => {
      const content = block?.content && typeof block.content === "object" && !Array.isArray(block.content) ? block.content : {};
      const collections = ["members", "items", "team", "teamMembers"]
        .filter((key) => Array.isArray(content[key]))
        .map((key) => ({ key, members: content[key].map(summarizeMember) }));
      return {
        id: block.id,
        name: block.name,
        blockType: block.blockType,
        status: block.status,
        title: content.title || content.heading || null,
        textPreview: String(content.text || content.description || "").replace(/\s+/g, " ").trim().slice(0, 180) || null,
        blockImageCandidates: imageUrl(content),
        collections,
      };
    }),
  }));

  const relevant = pages.map((page) => ({
    ...page,
    blocks: page.blocks.filter((block) => {
      const blob = JSON.stringify(block).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return /team|equipe|stephanie|portrait|photo|image/.test(blob);
    }),
  })).filter((page) => page.blocks.length);

  console.log(JSON.stringify({
    mse: "25.197-team-inspection",
    mode: "READ_ONLY",
    tenant: tenant.slug,
    site: { slug: site.slug, name: site.name, agency: site.agency },
    relevant,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
