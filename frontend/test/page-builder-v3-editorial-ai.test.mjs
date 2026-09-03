"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEditorialAiPayload,
} from "../lib/page-builder-v3/index.mjs";

test(
  "construit le payload IA éditorial",
  () => {
    const result =
      buildEditorialAiPayload({
        page: {
          id: "page-1",
          title: "Voyage à Budapest",
          slug: "voyage-budapest",
          blocks: [],
        },
        destination: "Budapest",
        agency: "Mondescale Ozoir",
        mode: "auto",
      });

    assert.equal(
      result.mode,
      "auto"
    );

    assert.equal(
      result.context.destination,
      "Budapest"
    );

    assert.equal(
      result.context.agency,
      "Mondescale Ozoir"
    );
  }
);

test(
  "utilise les valeurs éditoriales par défaut",
  () => {
    const result =
      buildEditorialAiPayload({
        page: {
          blocks: [],
        },
        destination: "Seychelles",
      });

    assert.equal(
      result.context.intent,
      "voyage sur mesure"
    );

    assert.equal(
      result.context.tone,
      "professionnel, humain et inspirant"
    );
  }
);
