"use strict";
const { validateOffer } = require("./domain");

const writableFields = ["type","status","title","description","imageUrl","terms","startAt","endAt"];
function sanitizeOffer(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Offer payload required");
  const value = Object.fromEntries(writableFields.filter(k => Object.prototype.hasOwnProperty.call(input,k)).map(k=>[k,input[k]]));
  if (Object.keys(input).some(k=>!writableFields.includes(k))) throw new RangeError("Unknown offer field");
  validateOffer(value);
  return {
    type:value.type, status:value.status, title:value.title.trim(),
    description:value.description ?? null, imageUrl:value.imageUrl ?? null,
    terms:value.terms ?? null, startAt:new Date(value.startAt), endAt:new Date(value.endAt)
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
      return prisma.framOffer.update({where:{id},data});
    },
    async listAgencies(tenantId) {
      if(!tenantId) throw new RangeError("Tenant required");
      return prisma.agency.findMany({where:{tenantId},include:{framAmbassador:true}});
    }
  };
}
module.exports={sanitizeOffer,createAdminService};
