const path = require("path");
const { NotFoundError, ValidationError } = require("../../core/errors");
const SeoFactoryRepository = require("./repository");
const SeoPlanner = require("./planner");
const ContentComposer = require("./composer");
const SchemaBuilder = require("./schema-builder");
const HtmlRenderer = require("./renderer");
const StaticPublisher = require("./publisher");
const slugify = require("./slug");

class SeoFactoryService {
  constructor(prisma) {
    this.repo = new SeoFactoryRepository(prisma);
    this.planner = new SeoPlanner();
    this.composer = new ContentComposer();
    this.schemaBuilder = new SchemaBuilder();
    this.renderer = new HtmlRenderer();
    this.publisher = new StaticPublisher(
      process.env.MINI_SITE_OUTPUT_DIR ||
      path.resolve(process.cwd(), "../generated-sites")
    );
  }

  async generate(input) {
    const agency = await this.repo.getAgency(input.agencyId);
    if (!agency) throw new NotFoundError("Agence introuvable.");

    const plan = this.planner.build(input, agency);
    const pages = this.composer.compose(plan);

    let site = null;
    if (input.siteId) {
      site = await this.repo.getSite(input.siteId);
      if (!site) throw new NotFoundError("Mini-site introuvable.");
      await this.repo.persistPages(site.id, pages);
    }

    const siteSlug = site?.slug || `${slugify(agency.city)}-${plan.topic.destinationSlug}`;
    const baseUrl = site?.domain
      ? `https://${site.domain}`
      : `${process.env.MINI_SITE_BASE_URL || "https://sites.mondescale.test"}/${siteSlug}`;

    const renderedPages = pages.map((page) => {
      const schema = this.schemaBuilder.build(plan, page, baseUrl);
      const html = this.renderer.render({
        plan,
        page,
        schema,
        baseUrl,
        links: plan.internalLinks,
      });
      return { page, schema, html };
    });

    let publication = null;
    if (input.publish) {
      publication = await this.publisher.publish({
        siteSlug,
        baseUrl,
        renderedPages,
      });
    }

    return {
      plan,
      pages,
      preview: renderedPages.map(({ page, schema, html }) => ({
        slug: page.slug,
        schema,
        html,
      })),
      publication,
    };
  }

  async publishExisting(siteId, input) {
    const site = await this.repo.getSite(siteId);
    if (!site) throw new NotFoundError("Mini-site introuvable.");
    if (!site.pages.length) throw new ValidationError("Le mini-site ne contient aucune page.");

    const agencyId = Number(site.agencyId);
    if (!Number.isInteger(agencyId)) {
      throw new ValidationError("Le champ MiniSite.agencyId doit contenir l'identifiant numérique d'une agence.");
    }

    return this.generate({ ...input, agencyId, siteId, publish: true });
  }
}

module.exports = SeoFactoryService;
