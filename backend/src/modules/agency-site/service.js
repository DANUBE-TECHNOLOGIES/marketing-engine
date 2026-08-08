const AgencySiteRepository = require("./repository");
const SiteBuilder = require("./builders/site-builder");
const ContentBuilder = require("./builders/content-builder");
const NavigationBuilder = require("./builders/navigation-builder");
const SitemapBuilder = require("./builders/sitemap-builder");
class AgencySiteService {
  constructor(prisma, tenantId) { this.repo = new AgencySiteRepository(prisma, tenantId); this.siteBuilder = new SiteBuilder(); this.contentBuilder = new ContentBuilder(); this.navigationBuilder = new NavigationBuilder(); this.sitemapBuilder = new SitemapBuilder(); }

  async listSites() {
    const sites = await this.repo.listSites();

    return sites.map((site) => ({
      id: site.id,
      name: site.name,
      slug: site.slug,
      status: site.status,
      agencyId: site.agencyId,
      agency: site.agency,
      pages: site.pages,
    }));
  }

  async generate(agencyId, options = {}) {
    const agency = await this.repo.getAgency(agencyId);
    if (!agency) { const e = new Error(`Agence ${agencyId} introuvable`); e.statusCode = 404; throw e; }
    const definition = this.siteBuilder.build(agency, options.slug);
    const site = await this.repo.upsertSite(definition.site);
    const ids = new Map();
    for (const page of definition.pages) {
      const parentId = page.parentKey ? ids.get(page.parentKey) || null : null;
      const saved = await this.repo.upsertPage(site.id, page, parentId);
      ids.set(page.key, saved.id);
      for (const section of this.contentBuilder.build(page, agency, site)) await this.repo.upsertSection(saved.id, section);
    }
    return this.get(agencyId);
  }
  async ensureRequiredPages(
    agencyId,
    requiredKeys = [
      "home",
      "agence",
      "services",
      "contact",
    ]
  ) {
    const agency =
      await this.repo.getAgency(
        agencyId
      );

    if (!agency) {
      const error =
        new Error(
          `Agence ${agencyId} introuvable`
        );

      error.statusCode =
        404;

      throw error;
    }

    const current =
      await this.repo.findByAgencyId(
        agencyId
      );

    if (!current) {
      /*
       * Aucun site :
       * ici seulement, la génération initiale complète
       * reste le comportement normal.
       */
      const generated =
        await this.generate(
          agencyId
        );

      return {
        created:
          generated?.pages?.length ||
          0,

        skipped:
          0,

        missing:
          [],

        generatedSite:
          true,

        site:
          generated,
      };
    }

    const definition =
      this.siteBuilder.build(
        agency,
        current.slug
      );

    const wanted =
      new Set(
        (
          requiredKeys ||
          []
        )
          .map(
            value =>
              String(
                value ||
                ""
              )
                .trim()
                .toLowerCase()
          )
          .filter(
            Boolean
          )
      );

    /*
     * Index des pages déjà existantes.
     *
     * Attention :
     * la HOME réelle utilise slug="" dans AgencySitePage.
     * Son identité stable dans le builder est page.key="home".
     */
    const existingBySlug =
      new Map(
        (
          current.pages ||
          []
        ).map(
          page => [
            String(
              page.slug ??
              ""
            ),
            page,
          ]
        )
      );

    const definitionByKey =
      new Map(
        (
          definition.pages ||
          []
        ).map(
          page => [
            String(
              page.key ||
              ""
            )
              .trim()
              .toLowerCase(),
            page,
          ]
        )
      );

    const pageIdsByKey =
      new Map();

    /*
     * Reconstituer les IDs des pages existantes à partir
     * du builder permet de résoudre un éventuel parentId
     * sans modifier ces pages.
     */
    for (
      const [
        key,
        definitionPage
      ]
      of definitionByKey
    ) {
      const existing =
        existingBySlug.get(
          String(
            definitionPage.slug ??
            ""
          )
        );

      if (existing) {
        pageIdsByKey.set(
          key,
          existing.id
        );
      }
    }

    let created =
      0;

    let skipped =
      0;

    const createdPages =
      [];

    const stillMissing =
      [];

    for (
      const key
      of wanted
    ) {
      const page =
        definitionByKey.get(
          key
        );

      if (!page) {
        stillMissing.push(
          key
        );

        continue;
      }

      const slug =
        String(
          page.slug ??
          ""
        );

      const existing =
        existingBySlug.get(
          slug
        );

      if (existing) {
        skipped +=
          1;

        pageIdsByKey.set(
          key,
          existing.id
        );

        continue;
      }

      const parentId =
        page.parentKey
          ? pageIdsByKey.get(
              String(
                page.parentKey
              )
                .trim()
                .toLowerCase()
            ) ||
            null
          : null;

      /*
       * upsertPage est utilisé uniquement sur une page
       * dont nous avons certifié l'absence.
       *
       * On n'exécute donc jamais sa branche UPDATE
       * sur une page existante.
       */
      const saved =
        await this.repo.upsertPage(
          current.id,
          page,
          parentId
        );

      pageIdsByKey.set(
        key,
        saved.id
      );

      existingBySlug.set(
        slug,
        saved
      );

      /*
       * Les sections ne sont générées que pour
       * CETTE nouvelle page.
       *
       * Aucun contenu existant n'est réécrit.
       */
      const sections =
        this.contentBuilder.build(
          page,
          agency,
          current
        );

      for (
        const section
        of sections
      ) {
        await this.repo.upsertSection(
          saved.id,
          section
        );
      }

      created +=
        1;

      createdPages.push({
        id:
          saved.id,

        key,

        slug,

        pageType:
          page.pageType,
      });
    }

    const refreshed =
      await this.get(
        agencyId
      );

    return {
      created,

      skipped,

      missing:
        stillMissing,

      generatedSite:
        false,

      createdPages,

      site:
        refreshed,
    };
  }

  async ensureDefaultContent(
    agencyId
  ) {
    const agency =
      await this.repo
        .getAgency(
          agencyId
        );

    if (!agency) {
      const error =
        new Error(
          `Agence ${agencyId} introuvable`
        );

      error.statusCode =
        404;

      throw error;
    }

    const site =
      await this.repo
        .findByAgencyId(
          agencyId
        );

    if (!site) {
      const error =
        new Error(
          `Mini-site de l'agence ${agencyId} introuvable`
        );

      error.statusCode =
        404;

      throw error;
    }

    const writer =
      new DefaultContentWriter({
        repository:
          this.repo,
      });

    return writer.ensure({
      agency,
      site,
    });
  }

  async compose(agencyId) {
    const agency = await this.repo.getAgency(agencyId);
    if (!agency) { const e = new Error(`Agence ${agencyId} introuvable`); e.statusCode = 404; throw e; }
    const current = await this.repo.findByAgencyId(agencyId);
    if (!current) return this.generate(agencyId);
    for (const page of current.pages) for (const section of this.contentBuilder.build(page, agency, current)) await this.repo.upsertSection(page.id, section);
    return this.get(agencyId);
  }
  async rebuild(agencyId, options = {}) { const current = await this.repo.findByAgencyId(agencyId); if (current) { await this.repo.deleteSectionsForSite(current.id); await this.repo.deletePages(current.id); } return this.generate(agencyId, options); }
  async get(agencyId) { const site = await this.repo.findByAgencyId(agencyId); if (!site) { const e = new Error(`Site de l'agence ${agencyId} introuvable`); e.statusCode = 404; throw e; } return { ...site, navigation: this.navigationBuilder.build(site.pages), metrics: { pageCount: site.pages.length, sectionCount: site.pages.reduce((n,p)=>n+(p.sections?.length||0),0), incompleteLegalSections: site.pages.flatMap(p=>p.sections||[]).filter(s=>s.jsonContent?.status?.startsWith("requires-")).length } }; }
  async page(agencyId, slug = "") { const page = await this.repo.findPage(agencyId, slug); if (!page) { const e = new Error(`Page ${slug || "accueil"} introuvable`); e.statusCode = 404; throw e; } return page; }
  async publicSite(siteSlug) {
    const site = await this.repo.findPublicSite(siteSlug);
    if (!site) { const e = new Error(`Site ${siteSlug} introuvable`); e.statusCode = 404; throw e; }
    return { ...site, navigation: this.navigationBuilder.build(site.pages), metrics: { pageCount: site.pages.length, sectionCount: site.pages.reduce((n,p)=>n+(p.sections?.length||0),0) } };
  }
  async publicPage(siteSlug, slug = "") {
    const page = await this.repo.findPublicPage(siteSlug, slug);
    if (!page) { const e = new Error(`Page publique ${slug || "accueil"} introuvable`); e.statusCode = 404; throw e; }
    return page;
  }

  async replacePageSections(agencyId, slug = "", input = {}) {
    const normalizedAgencyId = Number(agencyId);

    if (!Number.isInteger(normalizedAgencyId)) {
      const error = new Error(
        "Identifiant d’agence invalide."
      );
      error.statusCode = 400;
      error.code = "INVALID_AGENCY_ID";
      throw error;
    }

    const page = await this.repo.findPage(
      normalizedAgencyId,
      slug
    );

    if (!page) {
      const error = new Error(
        `Page ${slug || "accueil"} introuvable`
      );
      error.statusCode = 404;
      error.code = "AGENCY_SITE_PAGE_NOT_FOUND";
      throw error;
    }

    const sections = Array.isArray(input.sections)
      ? input.sections
      : null;

    if (!sections) {
      const error = new Error(
        "Le champ sections doit être un tableau."
      );
      error.statusCode = 400;
      error.code = "INVALID_AGENCY_SITE_SECTIONS";
      throw error;
    }

    if (sections.length > 100) {
      const error = new Error(
        "Une page ne peut pas contenir plus de 100 blocs."
      );
      error.statusCode = 400;
      error.code = "AGENCY_SITE_SECTION_LIMIT";
      throw error;
    }

    const normalized = sections.map((section, index) => {
      const sectionType = String(
        section.sectionType || section.type || ""
      ).trim();

      if (!sectionType) {
        const error = new Error(
          `Le type du bloc ${index + 1} est obligatoire.`
        );
        error.statusCode = 400;
        error.code = "AGENCY_SITE_SECTION_TYPE_REQUIRED";
        throw error;
      }

      return {
        sectionType,
        jsonContent:
          section.jsonContent &&
          typeof section.jsonContent === "object"
            ? section.jsonContent
            : {},
        status:
          section.enabled === false
            ? "hidden"
            : "draft",
      };
    });

    return this.repo.replacePageSections(
      page.id,
      normalized
    );
  }

  async sitemap(agencyId, origin) { const site = await this.get(agencyId); return this.sitemapBuilder.build(site, site.pages, origin); }
  async robots(agencyId, origin) { const site = await this.get(agencyId); return this.sitemapBuilder.robots(site, origin); }
}
module.exports = AgencySiteService;

const {
  DefaultContentWriter,
} =
  require(
    "./default-content-writer"
  );
