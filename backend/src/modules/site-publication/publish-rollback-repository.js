"use strict";

function isPublishedSite(site) {
  return Boolean(
    site &&
      (site.status === "published" ||
        site.published === true ||
        site.isPublished === true ||
        site.publishedAt)
  );
}

class PublishRollbackRepository {
  constructor(repository) {
    this.repository = repository;
    this.initialPublicationState = new Map();
  }

  async site(siteId) {
    const site = await this.repository.site(siteId);
    this.initialPublicationState.set(String(siteId), isPublishedSite(site));
    return site;
  }

  status(...args) {
    return this.repository.status(...args);
  }

  markPagePublished(...args) {
    return this.repository.markPagePublished(...args);
  }

  markPageUnpublished(...args) {
    return this.repository.markPageUnpublished(...args);
  }

  markSitePublished(...args) {
    return this.repository.markSitePublished(...args);
  }

  async markSiteUnpublished(siteId) {
    const id = String(siteId);

    if (this.initialPublicationState.get(id) === true) {
      return {
        id,
        status: "published",
        preserved: true,
        reason: "site-was-published-before-operation",
      };
    }

    return this.repository.markSiteUnpublished(siteId);
  }
}

module.exports = {
  PublishRollbackRepository,
  isPublishedSite,
};
