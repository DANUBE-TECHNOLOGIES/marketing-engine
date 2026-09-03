const GoogleBusinessClient = require("./client");
const GoogleBusinessPublisherRepository = require("./repository");
const { renderGoogleLocalPost } = require("./renderer");

class GoogleBusinessPublisherService {
  constructor(prisma, { repository, client } = {}) {
    this.repository = repository || new GoogleBusinessPublisherRepository(prisma);
    this.client = client || new GoogleBusinessClient();
  }

  health() {
    return {
      ok: true,
      version: "1.0.0",
      capability: "google-business-local-post-publisher",
      configured: this.client.isConfigured(),
      defaultMode: "dry-run"
    };
  }

  preview(payload = {}) {
    return {
      parent: payload.parent || null,
      request: renderGoogleLocalPost(payload.publication || payload.payload || {}, payload.options || {}),
      dryRun: true
    };
  }

  async publish(publicationId, payload = {}) {
    const publication = await this.repository.getPublication(publicationId);
    if (!publication) return this._fail(404, "Publication introuvable");
    if (publication.channel !== "google_business") return this._fail(409, "Cette publication n'est pas destinée à Google Business");
    const parent = payload.parent || publication.payload?.parent || process.env.GOOGLE_BUSINESS_PARENT;
    const request = renderGoogleLocalPost(publication.payload || {}, payload.options || {});
    const dryRun = payload.dryRun !== false;
    if (dryRun) return { publicationId, parent: parent || null, request, dryRun: true, status: publication.status };
    if (!parent) return this._fail(400, "GOOGLE_BUSINESS_PARENT ou parent est requis");

    await this.repository.updatePublication(publicationId, {
      status: "publishing",
      attempts: { increment: 1 },
      error: null
    });
    try {
      const result = await this.client.createLocalPost(parent, request);
      const updated = await this.repository.updatePublication(publicationId, {
        status: "published",
        publishedAt: new Date(),
        externalId: result.name || null,
        error: null
      });
      return { publication: updated, external: result, dryRun: false };
    } catch (error) {
      await this.repository.updatePublication(publicationId, {
        status: "failed",
        error: String(error.message || error).slice(0, 2000)
      });
      throw error;
    }
  }

  _fail(status, message) { const error = new Error(message); error.status = status; throw error; }
}
module.exports = GoogleBusinessPublisherService;
