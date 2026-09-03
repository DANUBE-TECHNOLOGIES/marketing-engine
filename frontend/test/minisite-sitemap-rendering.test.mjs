import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchMiniSiteSitemap,
} from "../lib/minisite-structured-data/client.js";

test(
  "le client retourne les entrées du sitemap",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch =
      async () => ({
        ok:
          true,

        async json() {
          return {
            summary: {
              entryCount:
                1,
            },

            entries: [
              {
                url:
                  "https://agences.mondescale.com/sites/agence-test",

                priority:
                  1,
              },
            ],
          };
        },
      });

    try {
      const result =
        await fetchMiniSiteSitemap({
          backendOrigin:
            "http://backend:4000",
        });

      assert.equal(
        result.entries.length,
        1
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);

test(
  "le client retourne un sitemap vide en cas d’erreur",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch =
      async () => {
        throw new Error(
          "network"
        );
      };

    try {
      const result =
        await fetchMiniSiteSitemap({
          backendOrigin:
            "http://backend:4000",
        });

      assert.deepEqual(
        result.entries,
        []
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  }
);
