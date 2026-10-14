const test = require("node:test");
const assert = require("node:assert/strict");
const { createAdminService } = require("../src/modules/ambassade-fram/admin-service");
const draft = {
  updatedAt: new Date("2026-10-14T12:00:00Z"),
  type: "EXCLUS_AMBASSADE", campaignMonth: "2026-11", status: "DRAFT", title: "Offre",
  startAt: "2026-11-01", endAt: "2026-12-01",
};
test("draft edit refuses a concurrent publication", async () => {
  const service = createAdminService({
    framOffer: {
      findUnique: async () => ({ ...draft, id: "offer-1" }),
      updateMany: async () => ({ count: 0 }),
    },
  });
  await assert.rejects(service.replaceDraft("offer-1", draft), /conflict/);
});
test("draft edit is conditional on DRAFT status", async () => {
  let where;
  const service = createAdminService({
    framOffer: {
      findUnique: async () => ({ ...draft, id: "offer-1" }),
      updateMany: async input => { where = input.where; return { count: 1 }; },
    },
  });
  await service.replaceDraft("offer-1", draft);
  assert.deepEqual(where, { id: "offer-1", status: "DRAFT", updatedAt: draft.updatedAt });
});
