"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  buildSeoUpdate,
  summarizeExecution,
} = require(
  "../src/modules/minisite-seo-enrichment"
);

test(
  "prépare uniquement les champs manquants",
  () => {
    const result =
      buildSeoUpdate({
        actions: {
          setSeoTitle:
            true,

          setMetaDescription:
            false,
        },

        generated: {
          seoTitle:
            "Agence de voyages à Bois-Colombes",

          metaDescription:
            "Description générée",
        },
      });

    assert.deepEqual(
      result,
      {
        seoTitle:
          "Agence de voyages à Bois-Colombes",
      }
    );
  }
);

test(
  "ignore une valeur générée vide",
  () => {
    const result =
      buildSeoUpdate({
        actions: {
          setSeoTitle:
            true,

          setMetaDescription:
            true,
        },

        generated: {
          seoTitle:
            "",

          metaDescription:
            " ",
        },
      });

    assert.deepEqual(
      result,
      {}
    );
  }
);

test(
  "résume les actions SEO",
  () => {
    const result =
      summarizeExecution([
        {
          changed:
            true,

          fields: [
            "seoTitle",
            "metaDescription",
          ],
        },

        {
          changed:
            true,

          fields: [
            "metaDescription",
          ],
        },

        {
          changed:
            false,

          fields: [],
        },
      ]);

    assert.deepEqual(
      result,
      {
        pagesProcessed:
          3,

        pagesChanged:
          2,

        pagesUnchanged:
          1,

        seoTitlesCreated:
          1,

        metaDescriptionsCreated:
          2,

        writeActions:
          3,
      }
    );
  }
);
