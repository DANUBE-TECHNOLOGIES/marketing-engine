"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildResidualWriteIntent } = require("../src/modules/minisite-semantic-engine/residual-write-intent");

function residualPlan() {
  const page = {
    siteSlug: "gien",
    agencyId: 4,
    city: "Gien",
    pageSlug: "services",
    pageId: "services-id",
    residualPageFingerprint: "c".repeat(64),
    metadata: { eligible: false, reason: "metadata-preserved-by-consolidated-plan" },
    eligibleSections: [{ intentKey: "ticketing", heading: "Billetterie et vols à Gien" }],
    suppressedSections: [],
    executable: true,
  };
  return {
    version: "mse-25.40",
    operation: "residual-semantic-execution-plan",
    readOnly: true,
    writes: false,
    policy: { noHomeScoreFilling: true, automaticWrites: false },
    residualExecutionFingerprint: "a".repeat(64),
    sites: [{ siteSlug: "gien", agencyId: 4, city: "Gien", pages: [page], executablePages: [page] }],
  };
}

function currentPage() {
  return {
    siteSlug: "gien",
    agencyId: 4,
    page: {
      title: "Nos services",
      slug: "services",
      status: "published",
      published: true,
      seoTitle: "Services de votre agence de voyages à Gien",
      metaDescription: "Découvrez les services de votre agence.",
      blocks: [{
        id: 10,
        type: "hero",
        status: "published",
        position: 0,
        content: { title: "Nos services", subtitle: "" },
        settings: {},
        seo: {},
        visibleDesktop: true,
        visibleMobile: true,
      }],
    },
  };
}

test("write-intent appends only the approved residual section and seals before/after snapshots", () => {
  const result = buildResidualWriteIntent({ residualPlan: residualPlan(), currentPages: [currentPage()] });
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.publicWrites, false);
  assert.equal(result.summary.touchedPageCount, 1);
  assert.equal(result.summary.snapshotCount, 1);
  assert.equal(result.intents.length, 1);
  const intent = result.intents[0];
  assert.match(intent.sourceSnapshotFingerprint, /^[0-9a-f]{64}$/);
  assert.match(intent.targetSnapshotFingerprint, /^[0-9a-f]{64}$/);
  assert.notEqual(intent.sourceSnapshotFingerprint, intent.targetSnapshotFingerprint);
  assert.equal(intent.snapshot.before.blocks.length, 1);
  assert.equal(intent.snapshot.after.blocks.length, 2);
  assert.equal(intent.snapshot.after.blocks[1].seo.generatedBy, "mse-25.40");
  assert.equal(intent.snapshot.after.blocks[1].seo.intentKey, "ticketing");
  assert.match(intent.snapshot.after.blocks[1].content.html, /conditions de modification/);
});

test("write-intent is deterministic", () => {
  const first = buildResidualWriteIntent({ residualPlan: residualPlan(), currentPages: [currentPage()] });
  const second = buildResidualWriteIntent({ residualPlan: residualPlan(), currentPages: [currentPage()] });
  assert.equal(first.writeIntentFingerprint, second.writeIntentFingerprint);
});

test("home secondary section writes are rejected even if a malformed plan marks them executable", () => {
  const plan = residualPlan();
  const candidate = plan.sites[0].executablePages[0];
  candidate.pageSlug = "home";
  candidate.city = "Gien";
  assert.throws(
    () => buildResidualWriteIntent({ residualPlan: plan, currentPages: [{ ...currentPage(), page: { ...currentPage().page, slug: "home" } }] }),
    (error) => error.code === "MSE_25_40_WRITE_INTENT_HOME_FILL_FORBIDDEN"
  );
});
