"use strict";

const {
  PrepublicationReadinessService,
} = require("./prepublication-readiness");

function normalizedSiteSlug(value) {
  return String(value || "").trim().toLowerCase();
}

class TargetedPrepublicationReadinessService extends PrepublicationReadinessService {
  constructor(options = {}) {
    super(options);
    this.siteSelector = null;
  }

  async readiness(agencyId, selector = {}) {
    const previousSelector = this.siteSelector;
    this.siteSelector = {
      siteSlug: normalizedSiteSlug(selector?.siteSlug),
    };

    try {
      return await super.readiness(agencyId);
    } finally {
      this.siteSelector = previousSelector;
    }
  }

  async loadAgency(agencyId) {
    const agency = await super.loadAgency(agencyId);
    const siteSlug = normalizedSiteSlug(this.siteSelector?.siteSlug);

    if (!siteSlug) {
      return agency;
    }

    const selectedSite = agency.agencySites?.[0] || null;
    if (normalizedSiteSlug(selectedSite?.slug) === siteSlug) {
      return agency;
    }

    const targetedSite = await this.prisma.agencySite.findFirst({
      where: {
        agencyId: Number(agencyId),
        tenantId: this.tenantId,
        slug: siteSlug,
      },
      include: {
        pages: {
          orderBy: { displayOrder: "asc" },
          include: {
            blocks: {
              orderBy: { displayOrder: "asc" },
            },
            sections: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });

    if (!targetedSite) {
      const error = new Error("Mini-site introuvable pour cette agence et ce tenant.");
      error.code = "AGENCY_LAUNCH_SITE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    return {
      ...agency,
      agencySites: [targetedSite],
    };
  }
}

module.exports = {
  TargetedPrepublicationReadinessService,
  normalizedSiteSlug,
};
