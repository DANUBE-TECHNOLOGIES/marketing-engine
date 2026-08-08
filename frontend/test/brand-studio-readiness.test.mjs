import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  groupReadinessChecks,
} from "../lib/brand-studio/readiness-api.js";

test(
  "regroupe les contrôles par catégorie",
  () => {
    const result =
      groupReadinessChecks([
        {
          id:
            "logo",

          category:
            "Médias",

          ready:
            true,
        },

        {
          id:
            "favicon",

          category:
            "Médias",

          ready:
            false,
        },

        {
          id:
            "legal",

          category:
            "Juridique",

          ready:
            true,
        },
      ]);

    assert.equal(
      result.length,
      2
    );

    assert.deepEqual(
      result[0],
      {
        category:
          "Médias",

        items: [
          {
            id:
              "logo",

            category:
              "Médias",

            ready:
              true,
          },

          {
            id:
              "favicon",

            category:
              "Médias",

            ready:
              false,
          },
        ],

        completed:
          1,

        count:
          2,
      }
    );
  }
);

test(
  "le workspace expose la section Préparation",
  () => {
    const source =
      fs.readFileSync(
        new URL(
          "../components/brand-studio/BrandStudioWorkspace.js",
          import.meta.url
        ),
        "utf8"
      );

    assert.match(
      source,
      /BrandReadinessPanel/
    );

    assert.match(
      source,
      /Préparation/
    );

    assert.match(
      source,
      /readiness-\$\{agencyId\}/
    );
  }
);

test(
  "le panneau présente les contrôles essentiels",
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
      /Préparation du mini-site/
    );

    assert.match(
      source,
      /Routes publiques/
    );

    assert.match(
      source,
      /Éléments manquants/
    );
  }
);
