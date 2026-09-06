"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  SITE_ACTION_IDS,
  OPERATIONAL_ACTION_IDS,
  extendTerritorialBlock,
  addEditorialActivation,
} = require(
  "./territorial-wave2-site-planner"
);

test(
  "AJ-D scopes five executable site actions",
  () => {
    assert.deepEqual(
      SITE_ACTION_IDS,
      [67, 69, 70, 71, 72]
    );

    assert.deepEqual(
      OPERATIONAL_ACTION_IDS,
      [65, 66, 68]
    );
  }
);

test(
  "AJ-D extends existing territorial paragraph",
  () => {
    const snapshot = {
      blocks: [
        {
          content: {
            html:
              "<p>Levallois-Perret " +
              "Asnières-sur-Seine Clichy " +
              "Neuilly-sur-Seine</p>",
          },
        },
      ],
    };

    const out =
      extendTerritorialBlock(snapshot);

    assert.equal(
      out.changed,
      true
    );

    assert.match(
      JSON.stringify(out.snapshot),
      /Colombes/
    );

    assert.match(
      JSON.stringify(out.snapshot),
      /Courbevoie/
    );
  }
);

test(
  "AJ-D editorial activation is idempotent",
  () => {
    const snapshot = {
      blocks: [
        {
          content: {
            html:
              "<p>Contenu destination.</p>",
          },
        },
      ],
    };

    const first =
      addEditorialActivation(snapshot);

    const second =
      addEditorialActivation(
        first.snapshot
      );

    assert.equal(
      first.changed,
      true
    );

    assert.equal(
      second.changed,
      false
    );
  }
);
