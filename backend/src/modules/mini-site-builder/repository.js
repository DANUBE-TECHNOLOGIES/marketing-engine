"use strict";
class PageBlockRepository {
  constructor(prisma, tenantId) { this.prisma = prisma; this.tenantId = tenantId; }
  pageWhere(pageId) { return { id: pageId, site: { tenantId: this.tenantId } }; }
  getPage(pageId) { return this.prisma.agencySitePage.findFirst({ where: this.pageWhere(pageId), include: { site: true } }); }
  list(pageId) { return this.prisma.pageBlock.findMany({ where: { pageId, page: { site: { tenantId: this.tenantId } } }, orderBy: { displayOrder: "asc" } }); }
  get(id) { return this.prisma.pageBlock.findFirst({ where: { id, page: { site: { tenantId: this.tenantId } } }, include: { page: { include: { site: true } } } }); }
  nextOrder(pageId) { return this.prisma.pageBlock.aggregate({ where: { pageId, page: { site: { tenantId: this.tenantId } } }, _max: { displayOrder: true } }); }
  create(pageId, data) { return this.prisma.pageBlock.create({ data: { pageId, ...data } }); }
  async update(id, data) { const current = await this.get(id); if (!current) return null; return this.prisma.pageBlock.update({ where: { id }, data: { ...data, version: { increment: 1 } } }); }
  async remove(id) { const current = await this.get(id); if (!current) return null; return this.prisma.pageBlock.delete({ where: { id } }); }
  async reorder(pageId, blocks) { await this.getPage(pageId); return this.prisma.$transaction(blocks.map(x => this.prisma.pageBlock.updateMany({ where: { id: x.id, pageId, page: { site: { tenantId: this.tenantId } } }, data: { displayOrder: x.displayOrder, version: { increment: 1 } } }))); }
}
module.exports = PageBlockRepository;
