import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidJsonLdGraph,
  serializeJsonLd,
} from "../lib/minisite-structured-data/serializer.js";

test(
  "sérialise un graphe JSON-LD",
  () => {
    const result =
      serializeJsonLd({
        "@context":
          "https://schema.org",

        "@graph": [
          {
            "@type":
              "TravelAgency",

            name:
              "Agence Test",
          },
        ],
      });

    assert.ok(
      result.includes(
        "TravelAgency"
      )
    );
  }
);

test(
  "neutralise une fermeture de script",
  () => {
    const result =
      serializeJsonLd({
        value:
          "</script><script>alert(1)</script>",
      });

    assert.equal(
      result.includes(
        "</script>"
      ),
      false
    );

    assert.ok(
      result.includes(
        "\\u003c"
      )
    );
  }
);

test(
  "valide un graphe Schema.org",
  () => {
    assert.equal(
      isValidJsonLdGraph({
        "@context":
          "https://schema.org",

        "@graph": [
          {
            "@type":
              "WebSite",
          },
        ],
      }),
      true
    );
  }
);

test(
  "refuse un graphe vide",
  () => {
    assert.equal(
      isValidJsonLdGraph({
        "@context":
          "https://schema.org",

        "@graph": [],
      }),
      false
    );
  }
);
