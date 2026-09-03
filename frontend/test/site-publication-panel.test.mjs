import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  normalizeHistoryItems,
  normalizeSiteId,
  publicationPercentage,
} from "../lib/brand-studio/site-publication-api.js";

test(
  "valide un identifiant de mini-site",
  () => {
    assert.equal(
      normalizeSiteId(
        "site-1"
      ),
      "site-1"
    );

    assert.throws(
      () =>
        normalizeSiteId(
          ""
        )
    );
  }
);

test(
  "calcule le pourcentage de publication",
  () => {
    assert.equal(
      publicationPercentage({
        pages: {
          total:
            12,

          published:
            9,
        },
      }),
      75
    );

    assert.equal(
      publicationPercentage({
        pages: {
          total:
            0,

          published:
            0,
        },
      }),
      0
    );
  }
);

test(
  "normalise l’historique",
  () => {
    const result =
      normalizeHistoryItems({
        items: [
          {
            id:
              "history-1",

            operation:
              "publish",

            outcome:
              "success",

            durationMs:
              1200,

            pages: {
              total:
                12,

              processed:
                12,
            },
          },
        ],
      });

    assert.equal(
      result.length,
      1
    );

    assert.equal(
      result[0].operation,
      "publish"
    );

    assert.equal(
      result[0].durationMs,
      1200
    );
  }
);

test(
  "le panneau expose les commandes",
  () => {
    const source =
      fs.readFileSync(
        new URL(
          "../components/brand-studio/SitePublicationPanel.js",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      source,
      /Publier le mini-site/
    );

    assert.match(
      source,
      /Dépublier/
    );

    assert.match(
      source,
      /Publication verrouillée/
    );

    assert.match(
      source,
      /Historique/
    );
  }
);

test(
  "le panneau est intégré une seule fois au Readiness",
  () => {
    const source =
      fs.readFileSync(
        new URL(
          "../components/brand-studio/BrandReadinessPanel.js",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      source,
      /SitePublicationPanel/
    );

    assert.match(
      source,
      /readinessScore/
    );

    assert.match(
      source,
      /readinessMissing/
    );

    assert.equal(
      (
        source.match(
          /<SitePublicationPanel/g
        ) ||
        []
      ).length,
      1
    );
  }
);
