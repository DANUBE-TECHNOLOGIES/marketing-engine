"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  normalizeSeoTitleLength,
} = require(
  "../src/modules/minisite-seo-enrichment/executor"
);

test(
  "conserve un titre conforme",
  () => {
    const title =
      "Agence de voyages à Bois-Colombes";

    assert.equal(
      normalizeSeoTitleLength(
        title,
        65
      ),
      title
    );
  }
);

test(
  "réduit un titre à 65 caractères maximum",
  () => {
    const title =
      "Agence de voyages à Bois-Colombes | Ambassade FRAM Mondescale Bois-Colombes";

    const result =
      normalizeSeoTitleLength(
        title,
        65
      );

    assert.ok(
      result.length <=
      65
    );

    assert.ok(
      result.length >
      20
    );
  }
);

test(
  "réduit à la frontière d’un mot",
  () => {
    const result =
      normalizeSeoTitleLength(
        "Contacter notre agence de voyages à Bois-Colombes | Mondescale",
        50
      );

    assert.ok(
      result.length <=
      50
    );

    assert.equal(
      /\s$/.test(result),
      false
    );
  }
);

test(
  "refuse de dépasser la limite même sans séparateur",
  () => {
    const result =
      normalizeSeoTitleLength(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZ",
        30
      );

    assert.ok(
      result.length <=
      30
    );
  }
);
