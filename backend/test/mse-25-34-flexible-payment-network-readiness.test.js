"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assessFlexiblePaymentSiteReadiness,
  buildFlexiblePaymentNetworkReadiness,
} = require("../src/modules/flexible-payment-experience");

function page(slug, options = {}) {
  return {
    id: `${slug}-1`,
    slug,
    status: options.published === false ? "draft" : "published",
    published: options.published !== false,
    blocks: options.blocks || [],
  };
}

function site(id, paymentPolicy, pages) {
  return {
    id,
    slug: id,
    agencyId: id,
    paymentPolicy,
    pages,
  };
}

test("unconfigured sites stay blocked and never inherit a financial claim", () => {
  const result = assessFlexiblePaymentSiteReadiness(site("gien", null, [page("home")]));
  assert.equal(result.status, "unconfigured");
  assert.equal(result.configured, false);
  assert.equal(result.proposals, 0);
  assert.deepEqual(result.reasons, ["payment-policy-missing"]);
});

test("disabled policies are distinguished from missing policies", () => {
  const result = assessFlexiblePaymentSiteReadiness(
    site("dax", { enabled: false, products: ["flight"] }, [page("home")])
  );
  assert.equal(result.status, "disabled");
  assert.equal(result.configured, true);
  assert.equal(result.enabled, false);
});

test("valid enabled policy with a published eligible page is ready", () => {
  const result = assessFlexiblePaymentSiteReadiness(
    site(
      "nevers",
      { enabled: true, products: ["flight"], installmentCounts: [3] },
      [page("home"), page("billetterie-et-vols")]
    )
  );
  assert.equal(result.status, "ready");
  assert.equal(result.proposals, 2);
});

test("draft pages do not count as rollout surfaces", () => {
  const result = assessFlexiblePaymentSiteReadiness(
    site(
      "lamorlaye",
      { enabled: true, products: ["flight"] },
      [page("home", { published: false }), page("billetterie", { published: false })]
    )
  );
  assert.equal(result.status, "no-eligible-page");
  assert.deepEqual(result.reasons, ["no-published-home-or-flight-page"]);
});

test("already deployed sites are reported separately from sites needing apply", () => {
  const result = assessFlexiblePaymentSiteReadiness(
    site(
      "maurepas",
      { enabled: true, products: ["flight"] },
      [page("home", { blocks: [{ blockType: "flexible_payment" }] })]
    )
  );
  assert.equal(result.status, "deployed");
  assert.equal(result.deployedBlocks, 1);
  assert.equal(result.proposals, 0);
});

test("network report is read-only and exposes coverage without writes", () => {
  const report = buildFlexiblePaymentNetworkReadiness([
    site("gien", { enabled: true, products: ["flight"] }, [page("home")]),
    site("dax", null, [page("home")]),
    site("nevers", { enabled: true, products: ["flight"] }, [
      page("home", { blocks: [{ blockType: "flexible_payment" }] }),
    ]),
    site("ozoir", { enabled: false, products: ["flight"] }, [page("home")]),
  ]);

  assert.equal(report.version, "mse-25.34");
  assert.equal(report.readOnly, true);
  assert.equal(report.writes, false);
  assert.deepEqual(report.summary, {
    total: 4,
    configured: 3,
    enabled: 2,
    ready: 1,
    deployed: 1,
    blocked: 2,
    coveragePercent: 50,
  });
});
