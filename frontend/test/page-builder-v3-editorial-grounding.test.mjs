"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEditorialAiPayload,
} from "../lib/page-builder-v3/index.mjs";

test(
  "le payload IA reste compatible avec Travel Core",
  () => {
    const result =
      buildEditorialAiPayload({
        page: {
          id:
            "page-1",

          title:
            "Voyage à Budapest",

          slug:
            "voyage-budapest",

          blocks: [],
        },

        destination:
          "Budapest",

        agency:
          "Mondescale Ozoir",

        mode:
          "auto",
      });

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
