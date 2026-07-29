const test = require("node:test");
const assert = require("node:assert/strict");
const MarketingAutomationService = require("../src/modules/marketing-automation/service");
const { truncate } = require("../src/modules/marketing-automation/utils");

const source = {
  title: "Week-end à Budapest : guide complet",
  destination: "Budapest",
  excerpt: "Découvrez les thermes, le Danube et les plus beaux quartiers de Budapest avec les conseils de votre agence.",
  highlights: ["Les bains Széchenyi", "Le Parlement", "Le quartier du château"],
  keywords: ["city break", "Hongrie"],
  agencyName: "Mondescale Voyages",
  agencyCity: "Ozoir-la-Ferrière",
  url: "https://example.test/budapest"
};

test("truncate respecte la limite", () => assert.ok(truncate("x ".repeat(100), 30).length <= 30));
test("render génère les six canaux", () => {
  const service = new MarketingAutomationService(null, {});
  const result = service.render({ source });
  assert.equal(result.outputs.length, 6);
  assert.deepEqual(result.channels, ["google_business", "facebook", "instagram", "linkedin", "brevo", "pages_jaunes"]);
});
test("chaque rendu respecte sa limite", () => {
  const service = new MarketingAutomationService(null, {});
  const result = service.render({ source: { ...source, content: "Voyage ".repeat(2000) } });
  for (const output of result.outputs) if (output.limits.text) assert.ok(output.text.length <= output.limits.text);
});
test("render refuse un canal inconnu", () => {
  const service = new MarketingAutomationService(null, {});
  assert.throws(() => service.render({ source, channels: ["tiktok"] }), /Canaux inconnus/);
});
test("création de campagne persiste campagne et publications", async () => {
  const calls = [];
  const repository = {
    async createCampaign(data) { calls.push(["campaign", data]); return { id: "cmp_1", ...data }; },
    async createPublications(id, outputs, scheduledAt) { calls.push(["publications", id, outputs, scheduledAt]); return outputs.map((payload, i) => ({ id: `pub_${i}`, payload })); }
  };
  const service = new MarketingAutomationService(null, repository);
  const result = await service.createCampaign({ name: "Budapest", source, channels: ["facebook", "brevo"], actor: "test" });
  assert.equal(result.publications.length, 2);
  assert.equal(calls[0][1].createdBy, "test");
});
