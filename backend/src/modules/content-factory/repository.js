"use strict";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraphsHtml(values = []) {
  return (Array.isArray(values) ? values : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map((value) => `<p>${escapeHtml(value)}</p>`)
    .join("");
}

function practicalHtml(content = {}) {
  const rows = [
    ["Meilleure période", content.bestTime],
    ["Durée conseillée", content.idealDuration],
    ["Monnaie", content.currency],
    ["Langue", content.language],
  ].filter(([, value]) => String(value || "").trim());
  if (!rows.length) return "<p>Demandez conseil à votre agence pour préparer les aspects pratiques de votre voyage.</p>";
  return `<ul>${rows.map(([label, value]) => `<li><strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function v2SectionPayload(section = {}) {
  const sectionType = String(section?.sectionType || "").trim().toLowerCase();
  const content = section?.content && typeof section.content === "object" ? section.content : {};

  if (sectionType === "overview") {
    return {
      blockType: "rich_text",
      content: {
        title: String(content.title || "").trim(),
        html: paragraphsHtml(content.paragraphs) || "<p>Contenu à compléter.</p>",
        alignment: "left",
      },
    };
  }

  if (sectionType === "highlights") {
    return {
      blockType: "features",
      content: {
        title: String(content.title || "Les incontournables").trim(),
        introduction: "",
        items: (Array.isArray(content.items) ? content.items : [])
          .map((item) => ({
            icon: "",
            title: String(item?.title || item?.name || "").trim(),
            text: String(item?.text || item?.description || "").trim(),
          }))
          .filter((item) => item.title),
        columns: 3,
      },
    };
  }

  if (sectionType === "practical") {
    return {
      blockType: "rich_text",
      content: {
        title: String(content.title || "Informations pratiques").trim(),
        html: practicalHtml(content),
        alignment: "left",
      },
    };
  }

  if (sectionType === "cta") {
    return {
      blockType: "cta",
      content: {
        title: String(content.title || "Votre voyage commence ici").trim(),
        text: String(content.text || "").trim(),
        primaryCta: content.primaryCta && typeof content.primaryCta === "object"
          ? content.primaryCta
          : {
              label: String(content.action || "Demander un devis").trim(),
              href: "#contact",
            },
        secondaryCta: content.secondaryCta || null,
        style: content.style || "primary",
      },
    };
  }

  if (sectionType === "hero") {
    return {
      blockType: "hero",
      content: {
        eyebrow: String(content.eyebrow || "").trim(),
        title: String(content.title || "").trim(),
        subtitle: String(content.subtitle || content.introduction || "").trim(),
        imageAssetId: String(content.imageAssetId || "").trim(),
        imageUrl: content.imageUrl || "",
        imageAlt: String(content.imageAlt || "").trim(),
        primaryCta: content.primaryCta || null,
        secondaryCta: content.secondaryCta || null,
        alignment: content.alignment || "left",
      },
    };
  }

  if (sectionType === "faq") {
    return {
      blockType: "faq",
      content: {
        title: String(content.title || "Questions fréquentes").trim(),
        items: (Array.isArray(content.items) ? content.items : [])
          .map((item) => ({
            question: String(item?.question || "").trim(),
            answer: String(item?.answer || "").trim(),
          }))
          .filter((item) => item.question && item.answer),
      },
    };
  }

  return {
    blockType: "rich_text",
    content: {
      title: String(content.title || "").trim(),
      html: paragraphsHtml(content.paragraphs)
        || (content.text ? `<p>${escapeHtml(content.text)}</p>` : "<p>Contenu à compléter.</p>"),
      alignment: "left",
    },
  };
}

function pageBlockData(section) {
  const adapted = v2SectionPayload(section);
  const content = adapted.content;

  return {
    blockType: adapted.blockType,
    name: typeof content.title === "string" && content.title.trim()
      ? content.title.trim()
      : null,
    content,
    settings: {},
    seo: { source: "content-factory", legacySectionType: String(section?.sectionType || "") },
    displayOrder: Number.isFinite(Number(section?.displayOrder))
      ? Number(section.displayOrder)
      : 0,
    status: "draft",
    visibleDesktop: true,
    visibleMobile: true,
    version: 1,
  };
}

class ContentFactoryRepository {
  constructor(prisma) { this.prisma = prisma; }

  getDestination(slug) {
    return this.prisma.destination.findUnique({
      where: { slug },
      include: {
        sections: { orderBy: { position: "asc" } },
        faqs: { orderBy: { position: "asc" } },
        themes: { include: { theme: true } },
        travelTypes: { include: { travelType: true } },
        tags: { include: { tag: true } },
      },
    });
  }

  getSite({ siteId, siteSlug }) {
    const where = siteId ? { id: siteId } : { slug: siteSlug };
    return this.prisma.agencySite.findUnique({
      where,
      include: { agency: true, pages: { include: { sections: true, blocks: true } } },
    });
  }

  async persist(site, pages, replace) {
    return this.prisma.$transaction(async (tx) => {
      const ids = new Map();

      for (const page of pages) {
        const existing = await tx.agencySitePage.findUnique({
          where: { siteId_slug: { siteId: site.id, slug: page.slug } },
        });

        if (existing && !replace) {
          ids.set(page.slug, existing.id);
          continue;
        }

        const parentId = page.parentSlug ? ids.get(page.parentSlug) || null : null;
        const saved = await tx.agencySitePage.upsert({
          where: { siteId_slug: { siteId: site.id, slug: page.slug } },
          update: {
            parentId,
            title: page.title,
            path: page.path,
            pageType: page.pageType,
            menuTitle: page.menuTitle,
            menuLocation: page.menuLocation,
            displayOrder: page.displayOrder,
            seoTitle: page.seoTitle,
            metaDescription: page.metaDescription,
            h1: page.h1,
            schemaType: page.schemaType,
            status: "draft",
            published: false,
          },
          create: {
            siteId: site.id,
            parentId,
            title: page.title,
            slug: page.slug,
            path: page.path,
            pageType: page.pageType,
            menuTitle: page.menuTitle,
            menuLocation: page.menuLocation,
            displayOrder: page.displayOrder,
            seoTitle: page.seoTitle,
            metaDescription: page.metaDescription,
            h1: page.h1,
            schemaType: page.schemaType,
            status: "draft",
            published: false,
          },
        });

        ids.set(page.slug, saved.id);

        for (const section of page.sections) {
          await tx.agencySiteSection.upsert({
            where: {
              pageId_sectionType: {
                pageId: saved.id,
                sectionType: section.sectionType,
              },
            },
            update: {
              jsonContent: section.content,
              displayOrder: section.displayOrder,
              status: "draft",
            },
            create: {
              pageId: saved.id,
              sectionType: section.sectionType,
              jsonContent: section.content,
              displayOrder: section.displayOrder,
              status: "draft",
            },
          });
        }

        if (existing && replace) {
          await tx.pageBlock.deleteMany({ where: { pageId: saved.id } });
        }

        const blocks = page.sections.map(pageBlockData);
        if (blocks.length) {
          await tx.pageBlock.createMany({
            data: blocks.map((block) => ({ pageId: saved.id, ...block })),
          });
        }
      }

      return { persisted: pages.length, pageIds: Object.fromEntries(ids) };
    });
  }
}

module.exports = ContentFactoryRepository;
module.exports.pageBlockData = pageBlockData;
module.exports.v2SectionPayload = v2SectionPayload;
