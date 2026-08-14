import test from "node:test";
import assert from "node:assert/strict";
import { assessLocalContentQuality, wordCount } from "../lib/seo/local-content-quality.js";

test("compte les mots du contenu éditorial utile", () => {
  assert.equal(wordCount("Un deux trois quatre"), 4);
});

test("détecte une page légère sans contexte local", () => {
  const result = assessLocalContentQuality({
    site: { agency: { city: "Gien" } },
    page: {
      blocks: [
        {
          blockType: "rich_text",
          content: {
            title: "Nos services",
            text: "Nous construisons votre voyage selon vos envies.",
          },
        },
      ],
    },
  });
  assert.equal(result.thin, true);
  assert.equal(result.needsEditorialDepth, true);
  assert.equal(result.needsLocalContext, true);
});

test("reconnaît la ville principale dans le contenu", () => {
  const result = assessLocalContentQuality({
    site: { agency: { city: "Dax" } },
    page: {
      blocks: [
        {
          blockType: "rich_text",
          content: {
            text: "Notre agence de voyages à Dax accompagne les voyageurs dans leurs projets.",
          },
        },
      ],
    },
  });
  assert.equal(result.hasPrimaryCity, true);
  assert.deepEqual(result.localMentions, ["Dax"]);
});
