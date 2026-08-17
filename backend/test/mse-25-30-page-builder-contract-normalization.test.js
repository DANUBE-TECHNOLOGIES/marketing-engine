"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  installPageBuilderContractNormalization,
  normalizeFeatureIntroduction,
} = require("../src/modules/minisite-seo-enrichment/page-builder-contract-patch");

test("MSE-25.30 convertit features.text en features.introduction", () => {
  const page = {
    changes: [{
      blockId: "features-1",
      blockType: "features",
      field: "text",
      previous: "",
      next: "Texte local attendu",
    }],
    optimizedBlocks: [{
      id: "features-1",
      blockType: "features",
      content: {
        title: "Pourquoi choisir notre agence ?",
        introduction: "",
        text: "Texte local attendu",
        items: [{ title: "Conseil", text: "Un conseil personnalisé" }],
        columns: 3,
      },
    }],
  };

  assert.equal(normalizeFeatureIntroduction(page), 1);
  assert.equal(page.optimizedBlocks[0].content.introduction, "Texte local attendu");
  assert.equal("text" in page.optimizedBlocks[0].content, false);
  assert.equal(page.changes[0].field, "introduction");
  assert.equal(page.changes[0].next, "Texte local attendu");
  assert.equal(page.changes[0].contractNormalized, true);
});

test("MSE-25.30 laisse les textes des items features intacts", () => {
  const page = {
    changes: [],
    optimizedBlocks: [{
      id: "features-1",
      blockType: "features",
      content: {
        title: "Pourquoi choisir notre agence ?",
        introduction: "",
        items: [{ title: "Conseil", text: "Texte item existant" }],
        columns: 3,
      },
    }],
  };

  assert.equal(normalizeFeatureIntroduction(page), 0);
  assert.equal(page.optimizedBlocks[0].content.items[0].text, "Texte item existant");
});

test("MSE-25.30 normalise le plan produit par buildAgencyContentOptimization", async () => {
  class FakeService {
    async buildAgencyContentOptimization() {
      return {
        pages: [{
          changes: [{
            blockId: "features-1",
            blockType: "features",
            field: "text",
            previous: "",
            next: "Introduction locale",
          }],
          optimizedBlocks: [{
            id: "features-1",
            type: "features",
            content: {
              introduction: "",
              text: "Introduction locale",
              items: [{ title: "Suivi", text: "Suivi complet" }],
            },
          }],
        }],
      };
    }
  }

  installPageBuilderContractNormalization(FakeService);
  const plan = await new FakeService().buildAgencyContentOptimization();

  assert.equal(plan.pageBuilderContract.version, "v2");
  assert.equal(plan.pageBuilderContract.normalizedFeatureChanges, 1);
  assert.equal(plan.pages[0].changes[0].field, "introduction");
  assert.equal(plan.pages[0].optimizedBlocks[0].content.introduction, "Introduction locale");
  assert.equal("text" in plan.pages[0].optimizedBlocks[0].content, false);
});
