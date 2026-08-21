"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSemanticProposals,
  deCity,
  h1For,
  metaFor,
  titleFor,
} = require("../src/modules/minisite-semantic-engine/semantic-proposals");

test("French local copy handles elision and produces natural commercial metadata", () => {
  assert.equal(deCity("Ozoir-la-Ferrière"), "d’Ozoir-la-Ferrière");
  assert.equal(deCity("Gien"), "de Gien");
  assert.match(titleFor("ticketing", "Gien"), /Billets d’avion et vols à Gien/);
  assert.equal(h1For("cruise", "Nevers"), "Croisières à Nevers");
  assert.match(metaFor("tailor-made", "Dax"), /voyage sur mesure.*Dax/i);
});

test("existing-page proposals are exact, read-only and preserve manual body copy", () => {
  const result = buildSemanticProposals({
    site: { city: "Gien" },
    opportunities: [{
      type: "strengthen-existing-page",
      intentKey: "ticketing",
      pageSlug: "services",
      valueScore: 91,
      reason: "intent-weak",
    }],
    topicGraph: {
      edges: [
        { fromPageSlug: "services", toPageSlug: "contact", toIntent: "contact", targetPriority: 58 },
        { fromPageSlug: "services", toPageSlug: "destinations", toIntent: "destinations", targetPriority: 80 },
      ],
    },
  });
  const proposal = result.proposals[0];
  assert.equal(proposal.type, "existing-page-semantic-uplift");
  assert.equal(proposal.writes, false);
  assert.equal(proposal.safeguards.preserveManualBodyCopy, true);
  assert.match(proposal.proposed.seoTitle, /Gien/);
  assert.match(proposal.proposed.h1, /Gien/);
  assert.match(proposal.proposed.metaDescription, /Gien/);
  assert.deepEqual(proposal.proposed.internalLinks.map((row) => row.toPageSlug), ["destinations", "contact"]);
});

test("new page candidates stay behind a search-demand evidence gate", () => {
  const result = buildSemanticProposals({
    site: { city: "Lamorlaye" },
    opportunities: [{ type: "page-candidate-review", intentKey: "cruise", pageSlug: null }],
    topicGraph: { edges: [] },
  });
  const proposal = result.proposals[0];
  assert.equal(proposal.type, "new-page-evidence-gate");
  assert.equal(proposal.requiresSearchDemandEvidence, true);
  assert.equal(proposal.requiresHumanReview, true);
  assert.equal(proposal.writes, false);
});
