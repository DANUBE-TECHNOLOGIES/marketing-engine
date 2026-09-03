const test = require("node:test");
const assert = require("node:assert/strict");
const EditorialCalendarService = require("../src/modules/editorial-calendar/service");
const { buildSlots } = require("../src/modules/editorial-calendar/planner");

const payload = {
  siteId: "site_ozoir",
  startDate: "2026-08-03T09:00:00.000Z",
  endDate: "2026-08-16T18:00:00.000Z",
  postsPerWeek: 3,
  agency: { name: "Mondescale Voyages", city: "Ozoir-la-Ferrière" },
  destinations: [
    { name: "Crète", slug: "crete", url: "https://example.test/crete", highlights: ["Héraklion", "La Canée"] },
    { name: "Budapest", slug: "budapest", url: "https://example.test/budapest" }
  ],
  channels: ["google_business", "facebook"]
};

test("planner produit une cadence régulière et bornée", () => {
  const slots = buildSlots(payload);
  assert.equal(slots.length, 6);
  assert.ok(slots.every((slot) => new Date(slot.scheduledAt) >= new Date(payload.startDate)));
  assert.ok(slots.every((slot) => new Date(slot.scheduledAt) <= new Date(payload.endDate)));
});

test("planner alterne destinations et formats", () => {
  const slots = buildSlots(payload);
  assert.equal(slots[0].destination.slug, "crete");
  assert.equal(slots[1].destination.slug, "budapest");
  assert.notEqual(slots[0].format, slots[1].format);
});

test("preview retourne un calendrier sans persistance", () => {
  const service = new EditorialCalendarService(null, { createCampaign() { throw new Error("ne doit pas être appelé"); } });
  const result = service.preview(payload);
  assert.equal(result.total, 6);
  assert.equal(result.siteId, "site_ozoir");
  assert.equal(result.slots[0].channels.length, 2);
});

test("generate crée une campagne par créneau", async () => {
  const calls = [];
  const marketingService = {
    async createCampaign(data) { calls.push(data); return { id: `cmp_${calls.length}`, ...data }; }
  };
  const service = new EditorialCalendarService(null, marketingService);
  const result = await service.generate({ ...payload, actor: "test" });
  assert.equal(result.campaigns.length, 6);
  assert.equal(calls[0].metadata.generatedBy, "editorial-calendar");
  assert.equal(calls[0].actor, "test");
});

test("validation refuse une période sans destination", () => {
  const service = new EditorialCalendarService(null, {});
  assert.throws(() => service.preview({ startDate: payload.startDate, endDate: payload.endDate, destinations: [] }), /destinations/);
});
