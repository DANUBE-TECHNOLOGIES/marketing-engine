"use strict";

function pageIsPublished(page) {
  return Boolean(
    page &&
      (page.published === true ||
        String(page.status || "").toLowerCase() === "published")
  );
}

class ResilientUnpublishService {
  constructor({
    service,
    repository,
    pagePublicationClient,
  }) {
    this.service = service;
    this.repository = repository;
    this.pagePublicationClient = pagePublicationClient;
  }

  status(...args) {
    return this.service.status(...args);
  }

  plan(...args) {
    return this.service.plan(...args);
  }

  history(...args) {
    return this.service.history(...args);
  }

  publish(...args) {
    return this.service.publish(...args);
  }

  async unpublish({ siteId, headers }) {
    const before = await this.repository.site(siteId);
    const initiallyPublishedPages = new Map(
      (before.pages || [])
        .filter(pageIsPublished)
        .map((page) => [String(page.id), page])
    );

    try {
      return await this.service.unpublish({ siteId, headers });
    } catch (error) {
      const compensation = [];

      try {
        const current = await this.repository.site(siteId);

        for (const page of current.pages || []) {
          const initial = initiallyPublishedPages.get(String(page.id));
          if (!initial || pageIsPublished(page)) continue;

          try {
            await this.pagePublicationClient.publish({
              pageId: page.id,
              headers,
              body: {
                source: "site-unpublication-compensation",
                siteId: before.id,
                siteSlug: before.slug,
              },
            });
            compensation.push({
              pageId: String(page.id),
              slug: page.slug,
              outcome: "success",
            });
          } catch (restoreError) {
            compensation.push({
              pageId: String(page.id),
              slug: page.slug,
              outcome: "failed",
              error: {
                code: restoreError?.code || restoreError?.name || "RESTORE_FAILED",
                message: restoreError?.message || "Restauration impossible.",
              },
            });
          }
        }

        if (
          before.status === "published" ||
          before.published === true ||
          before.publishedAt
        ) {
          await this.repository.markSitePublished(before.id);
        }
      } catch (compensationError) {
        compensation.push({
          outcome: "failed",
          scope: "site",
          error: {
            code: compensationError?.code || compensationError?.name || "SITE_RESTORE_FAILED",
            message: compensationError?.message || "Restauration du mini-site impossible.",
          },
        });
      }

      error.details = {
        ...(error.details || {}),
        unpublicationCompensation: compensation,
      };

      throw error;
    }
  }
}

module.exports = {
  ResilientUnpublishService,
  pageIsPublished,
};
