"use strict";
const { validateOffer } = require("./domain");

const writableFields = ["type","status","title","description","imageUrl","terms","startAt","endAt","priceCents","quoteUrl"];
function sanitizeOffer(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Offer payload required");
  const value = Object.fromEntries(writableFields.filter(k => Object.prototype.hasOwnProperty.call(input,k)).map(k=>[k,input[k]]));
  if (Object.keys(input).some(k=>!writableFields.includes(k))) throw new RangeError("Unknown offer field");
  validateOffer(value);
  if (value.priceCents != null && (!Number.isSafeInteger(value.priceCents) || value.priceCents < 0)) throw new RangeError("Invalid price");
  if (value.quoteUrl != null) {
    if (typeof value.quoteUrl !== "string" || value.quoteUrl.length > 2048) throw new RangeError("Invalid quote URL");
    let parsed;
    try { parsed = new URL(value.quoteUrl); } catch { throw new RangeError("Invalid quote URL"); }
    if (parsed.protocol !== "https:") throw new RangeError("HTTPS quote URL required");
  }
  return {
    type:value.type, status:value.status, title:value.title.trim(),
    description:value.description ?? null, imageUrl:value.imageUrl ?? null,
    terms:value.terms ?? null, priceCents:value.priceCents ?? null, quoteUrl:value.quoteUrl ?? null, startAt:new Date(value.startAt), endAt:new Date(value.endAt)
  };
}
function createAdminService(prisma) {
  return {
    listOffers: () => prisma.framOffer.findMany({orderBy:[{startAt:"desc"},{id:"asc"}]}),
    async createOffer(input) {
      const data=sanitizeOffer(input);
      // Publication requires separate explicit approval in a later secured route.
      if(data.status!=="DRAFT") throw new RangeError("New offers must start as drafts");
      return prisma.framOffer.create({data});
    },
    async replaceDraft(id,input) {
      if(typeof id!=="string"||!id) throw new RangeError("Invalid id");
      const data=sanitizeOffer(input);
      if(data.status!=="DRAFT") throw new RangeError("Draft editing cannot publish");
      const existing=await prisma.framOffer.findUnique({where:{id}});
      if(!existing||existing.status!=="DRAFT") throw new RangeError("Only draft offers may be edited");
      const result = await prisma.framOffer.updateMany({where:{id,status:"DRAFT"},data});
      if(result.count!==1) throw new RangeError("Draft editing conflict");
      return prisma.framOffer.findUnique({where:{id}});
    },
    async publishOffer(id) {
      if (typeof id !== "string" || !id.trim()) throw new RangeError("Invalid offer id");
      const existing = await prisma.framOffer.findUnique({ where: { id } });
      if (!existing || existing.status !== "DRAFT") throw new RangeError("Only drafts may be published");
      validateOffer({ ...existing, status: "PUBLISHED" });
      if (!existing.terms || !existing.terms.trim()) throw new RangeError("Offer terms required before publication");
      const result = await prisma.framOffer.updateMany({
        where: { id, status: "DRAFT" },
        data: { status: "PUBLISHED" },
      });
      if (result.count !== 1) throw new RangeError("Offer publication conflict");
      return prisma.framOffer.findUnique({ where: { id } });
    },
    async approveAgency(tenantId, agencyId) {
      if (!tenantId || !Number.isSafeInteger(agencyId) || agencyId <= 0) throw new RangeError("Invalid agency approval");
      const agency = await prisma.agency.findFirst({ where: { id: agencyId, tenantId }, select: { id: true } });
      if (!agency) throw new RangeError("Agency not found in tenant");
      return prisma.framAmbassadorAgency.upsert({
        where: { agencyId },
        create: { agencyId, enabled: true, approvedAt: new Date() },
        update: { enabled: true },
      });
    },
    async disableAgency(tenantId, agencyId) {
      if (!tenantId || !Number.isSafeInteger(agencyId) || agencyId <= 0) throw new RangeError("Invalid agency");
      const agency = await prisma.agency.findFirst({ where: { id: agencyId, tenantId }, select: { id: true } });
      if (!agency) throw new RangeError("Agency not found in tenant");
      return prisma.framAmbassadorAgency.updateMany({ where: { agencyId }, data: { enabled: false } });
    },
    async listAgencies(tenantId) {
      if(!tenantId) throw new RangeError("Tenant required");
      return prisma.agency.findMany({where:{tenantId},include:{framAmbassador:true}});
    }
  };
}
module.exports={sanitizeOffer,createAdminService};
