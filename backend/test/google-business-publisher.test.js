const test = require("node:test");
const assert = require("node:assert/strict");
const { renderGoogleLocalPost } = require("../src/modules/publishers/google-business/renderer");
const GoogleBusinessPublisherService = require("../src/modules/publishers/google-business/service");

test("renderer construit un LocalPost standard", () => {
  const result = renderGoogleLocalPost({ text: "Découvrez Budapest", url: "https://example.test/budapest" });
  assert.equal(result.topicType, "STANDARD");
  assert.equal(result.callToAction.actionType, "LEARN_MORE");
});

test("renderer limite le résumé à 1500 caractères", () => {
  const result = renderGoogleLocalPost({ text: "x".repeat(1800) });
  assert.ok(result.summary.length <= 1500);
});

test("preview ne publie rien", () => {
  const service = new GoogleBusinessPublisherService(null, { repository: {}, client: { isConfigured: () => false } });
  const result = service.preview({ publication: { text: "Voyage à Budapest" } });
  assert.equal(result.dryRun, true);
});

test("publication live met à jour le statut et l'identifiant externe", async () => {
  const updates = [];
  const repository = {
    async getPublication() { return { id: "pub_1", channel: "google_business", status: "draft", payload: { text: "Budapest" } }; },
    async updatePublication(id, data) { updates.push(data); return { id, ...data }; }
  };
  const client = { isConfigured: () => true, async createLocalPost() { return { name: "accounts/1/locations/2/localPosts/3" }; } };
  const service = new GoogleBusinessPublisherService(null, { repository, client });
  const result = await service.publish("pub_1", { parent: "accounts/1/locations/2", dryRun: false });
  assert.equal(result.publication.status, "published");
  assert.equal(result.publication.externalId, "accounts/1/locations/2/localPosts/3");
  assert.equal(updates[0].status, "publishing");
});

test("une erreur API place la publication en échec", async () => {
  const updates = [];
  const repository = {
    async getPublication() { return { id: "pub_1", channel: "google_business", payload: { text: "Budapest" } }; },
    async updatePublication(id, data) { updates.push(data); return { id, ...data }; }
  };
  const client = { isConfigured: () => true, async createLocalPost() { throw new Error("quota"); } };
  const service = new GoogleBusinessPublisherService(null, { repository, client });
  await assert.rejects(() => service.publish("pub_1", { parent: "accounts/1/locations/2", dryRun: false }), /quota/);
  assert.equal(updates.at(-1).status, "failed");
});
