"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildQualityUpliftWriteIntents,
  sha256Text,
} = require("../src/modules/minisite-seo-enrichment/quality-uplift-write-intent");

const FP = "a".repeat(64);

function page(slug, blocks, extra = {}) {
  return {
    agencyId: 1,
    siteSlug: "gien",
    page: {
      title: slug === "home" ? "Accueil" : "Avis clients",
      slug,
      status: "published",
      published: true,
      seoTitle: extra.seoTitle || "",
      metaDescription: extra.metaDescription || "",
      blocks,
    },
  };
}

function executionPage({ operations, pageSlug = "avis", bodyCopyPreview = null }) {
  return {
    key: `gien:${pageSlug}`,
    agencyId: 1,
    siteSlug: "gien",
    pageSlug,
    executionPayloadComplete: true,
    executionPayload: {
      payloadComplete: true,
      operations,
      bodyCopyPreview,
    },
  };
}

function plan(pages) {
  return {
    version: "mse-25.31",
    operation: "quality-uplift-execution-plan",
    readOnly: true,
    writes: false,
    publicWrites: false,
    executable: true,
    executionPlanFingerprint: FP,
    pages,
  };
}

test("write-intent builds validated Website Designer V2 bodies without persistence calls", () => {
  const current = [
    page("avis", [
      { id: "hero-avis", type: "hero", status: "published", position: 0, content: { title: "Avis clients" } },
      { id: "copy-avis", type: "rich_text", status: "published", position: 2, content: { html: "<p>Avis actuels.</p>" } },
    ], { seoTitle: "Avis", metaDescription: "Avis actuels" }),
  ];
  const operations = [
    { type: "strengthen-title", target: { scope: "page", field: "seoTitle" }, sourceValueFingerprint: sha256Text("Avis"), finalValue: "Avis clients à Gien" },
    { type: "strengthen-meta-description", target: { scope: "page", field: "metaDescription" }, sourceValueFingerprint: sha256Text("Avis actuels"), finalValue: "Découvrez les avis clients de votre agence à Gien." },
    { type: "strengthen-h1", target: { scope: "block", blockType: "hero", blockId: "hero-avis", field: "title" }, sourceValueFingerprint: sha256Text("Avis clients"), finalValue: "Avis clients de votre agence de voyages à Gien" },
    { type: "enrich-body" },
  ];
  const result = buildQualityUpliftWriteIntents({
    executionPlan: plan([executionPage({ operations, bodyCopyPreview: { title: "Votre agence à Gien", html: "<p>Conseils et accompagnement.</p>" } })]),
    currentPages: current,
  });
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.publicWrites, false);
  assert.equal(result.persistenceCallsPerformed, 0);
  assert.match(result.writeIntentFingerprint, /^[0-9a-f]{64}$/);
  assert.equal(result.summary.touchedPageCount, 1);
  const intent = result.intents[0];
  assert.equal(intent.persistence.method, "PageBuilderPersistenceService.save");
  assert.equal(intent.persistence.body.page.seoTitle, "Avis clients à Gien");
  assert.equal(intent.persistence.body.page.metaDescription, "Découvrez les avis clients de votre agence à Gien.");
  assert.equal(intent.persistence.body.blocks.find((block) => block.type === "hero").content.title, "Avis clients de votre agence de voyages à Gien");
  assert.equal(intent.persistence.body.blocks.at(-1).type, "rich_text");
  assert.equal(intent.persistence.body.blocks.at(-1).content.html, "<p>Conseils et accompagnement.</p>");
  assert.equal(intent.persistence.body.blocks.at(-1).position, 3);
  assert.deepEqual(intent.persistence.body.blocks.map((block) => block.position), [0, 2, 3]);
});

test("write-intent supports one approved candidate touching another page for internal linking", () => {
  const sourceHtml = "<p>Bienvenue à Gien.</p>";
  const current = [
    page("avis", [{ id: "hero-avis", type: "hero", content: { title: "Avis" } }]),
    page("home", [{ id: "copy-home", type: "rich_text", content: { html: sourceHtml } }]),
  ];
  const link = {
    type: "add-internal-link",
    target: { scope: "block", pageSlug: "home", blockType: "rich_text", blockId: "copy-home", field: "content.html" },
    sourceValueFingerprint: sha256Text(sourceHtml),
    link: { href: "/agence/gien/avis", label: "Découvrir Avis clients" },
    finalValue: `${sourceHtml}<p><a href="/agence/gien/avis">Découvrir Avis clients</a></p>`,
  };
  const result = buildQualityUpliftWriteIntents({ executionPlan: plan([executionPage({ operations: [link] })]), currentPages: current });
  assert.equal(result.summary.approvedCandidateCount, 1);
  assert.equal(result.summary.touchedPageCount, 1);
  assert.equal(result.intents[0].pageSlug, "home");
  assert.equal(result.intents[0].persistence.body.blocks[0].content.html, link.finalValue);
});

test("write-intent fingerprint changes with the final Website Designer body", () => {
  const operation = { type: "enrich-body" };
  const first = buildQualityUpliftWriteIntents({
    executionPlan: plan([executionPage({ operations: [operation], bodyCopyPreview: { title: "Informations", html: "<p>Version A</p>" } })]),
    currentPages: [page("avis", [])],
  });
  const second = buildQualityUpliftWriteIntents({
    executionPlan: plan([executionPage({ operations: [operation], bodyCopyPreview: { title: "Informations", html: "<p>Version B</p>" } })]),
    currentPages: [page("avis", [])],
  });
  assert.notEqual(first.writeIntentFingerprint, second.writeIntentFingerprint);
});

test("write-intent fails closed when persisted metadata changed after approval", () => {
  const current = [page("avis", [], { seoTitle: "Titre modifié manuellement" })];
  const operation = {
    type: "strengthen-title",
    target: { scope: "page", field: "seoTitle" },
    sourceValueFingerprint: sha256Text("Ancien titre"),
    finalValue: "Nouveau titre SEO",
  };
  assert.throws(
    () => buildQualityUpliftWriteIntents({ executionPlan: plan([executionPage({ operations: [operation] })]), currentPages: current }),
    (error) => error.code === "MSE_25_31_WRITE_INTENT_SOURCE_MISMATCH"
  );
});

test("write-intent refuses stale or wrong-type internal-link targets", () => {
  const current = [
    page("avis", []),
    page("home", [{ id: "copy-home", type: "hero", content: { html: "<p>Accueil</p>" } }]),
  ];
  const operation = {
    type: "add-internal-link",
    target: { scope: "block", pageSlug: "home", blockType: "rich_text", blockId: "copy-home", field: "content.html" },
    sourceValueFingerprint: sha256Text("<p>Accueil</p>"),
    link: { href: "/agence/gien/avis", label: "Avis" },
    finalValue: "<p>Accueil</p><p><a href=\"/agence/gien/avis\">Avis</a></p>",
  };
  assert.throws(
    () => buildQualityUpliftWriteIntents({ executionPlan: plan([executionPage({ operations: [operation] })]), currentPages: current }),
    (error) => error.code === "MSE_25_31_WRITE_INTENT_TARGET_INVALID"
  );
});
