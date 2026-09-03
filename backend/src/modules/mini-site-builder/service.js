"use strict";
const PageBlockRepository = require("./repository");
const { validateBlockInput, validateReorderInput, BLOCK_TYPES } = require("./validation");
const { renderPage } = require("./renderers/html-renderer");
class MiniSiteBuilderService {
  constructor(prismaOrRepo, tenantId) { this.repo = prismaOrRepo?.getPage ? prismaOrRepo : new PageBlockRepository(prismaOrRepo, tenantId); }
  health() { return { ok: true, version: "14.1.0", capability: "page-block-engine", blockTypes: [...BLOCK_TYPES] }; }
  async requirePage(pageId) { const page = await this.repo.getPage(pageId); if (!page) throw Object.assign(new Error("Page introuvable pour ce tenant."), { statusCode: 404, code: "PAGE_NOT_FOUND" }); return page; }
  async list(pageId) { await this.requirePage(pageId); return this.repo.list(pageId); }
  async get(id) { const block = await this.repo.get(id); if (!block) throw Object.assign(new Error("Bloc introuvable pour ce tenant."), { statusCode: 404, code: "PAGE_BLOCK_NOT_FOUND" }); return block; }
  async create(pageId, input) { await this.requirePage(pageId); const data = validateBlockInput(input); if (data.displayOrder == null) { const r = await this.repo.nextOrder(pageId); data.displayOrder = (r?._max?.displayOrder ?? -1) + 1; } return this.repo.create(pageId, { settings: {}, seo: {}, status: "draft", visibleDesktop: true, visibleMobile: true, ...data }); }
  async update(id, input) { await this.get(id); const updated = await this.repo.update(id, validateBlockInput(input, { partial: true })); return updated; }
  async remove(id) { await this.get(id); return this.repo.remove(id); }
  async reorder(pageId, input) { await this.requirePage(pageId); const order = validateReorderInput(input); await this.repo.reorder(pageId, order); return this.repo.list(pageId); }
  async render(pageId, theme = {}) { const page = await this.requirePage(pageId); const blocks = await this.repo.list(pageId); return renderPage(page, blocks, theme); }
}
module.exports = MiniSiteBuilderService;
