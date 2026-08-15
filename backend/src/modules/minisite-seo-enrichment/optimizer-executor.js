"use strict";

function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }

async function applyOptimizedSeoItems(repository, { items, dryRun = true } = {}) {
  const execute = async (client) => {
    const results = [];
    for (const item of items || []) {
      const current = await client.agencySitePage.findUnique({
        where: { id: item.pageId },
        select: { id: true, seoTitle: true, metaDescription: true },
      });
      if (!current) {
        const error = new Error(`Page introuvable : ${item.pageId}`);
        error.code = "MINISITE_SEO_PAGE_NOT_FOUND";
        error.status = 404;
        throw error;
      }
      const data = {};
      const previous = {};
      if (item.actions?.setSeoTitle && clean(item.generated?.seoTitle) && clean(current.seoTitle) !== clean(item.generated.seoTitle)) {
        previous.seoTitle = clean(current.seoTitle);
        data.seoTitle = clean(item.generated.seoTitle);
      }
      if (item.actions?.setMetaDescription && clean(item.generated?.metaDescription) && clean(current.metaDescription) !== clean(item.generated.metaDescription)) {
        previous.metaDescription = clean(current.metaDescription);
        data.metaDescription = clean(item.generated.metaDescription);
      }
      const fields = Object.keys(data);
      if (!dryRun && fields.length) {
        await client.agencySitePage.update({ where: { id: item.pageId }, data });
      }
      results.push({ pageId: item.pageId, slug: item.slug, changed: fields.length > 0, fields, previous, next: data, dryRun });
    }
    return {
      dryRun,
      overwrite: true,
      items: results,
      summary: {
        pagesProcessed: results.length,
        pagesChanged: results.filter((item) => item.changed).length,
        pagesUnchanged: results.filter((item) => !item.changed).length,
        seoTitlesOptimized: results.filter((item) => item.fields.includes("seoTitle")).length,
        metaDescriptionsOptimized: results.filter((item) => item.fields.includes("metaDescription")).length,
      },
    };
  };
  if (dryRun) return execute(repository.prisma);
  return repository.prisma.$transaction((transaction) => execute(transaction));
}

module.exports = { applyOptimizedSeoItems };
