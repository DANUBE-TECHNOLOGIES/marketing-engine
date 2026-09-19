"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  objectivesFor,
  actionsFor,
  buildTerritorialActionPlan,
} = require(
  "../src/modules/ranking-grid/territorial-action-plan"
);

test(
  "MSE-25.246 territorial recommendations are French and agency-agnostic",
  () => {
    const actions = actionsFor(
      "Levallois-Perret",
      { p1: 2, p2: 0, p3: 0 }
    );

    assert.ok(actions.length >= 6);

    const linking = actions.find(
      (row) => row.code === "internal_linking"
    );

    assert.ok(linking);
    assert.match(
      linking.action,
      /page de l’agence/
    );
    assert.match(
      linking.action,
      /Levallois-Perret/
    );

    assert.doesNotMatch(
      linking.action,
      /Bois-Colombes/
    );

    assert.ok(
      actions.every(
        (row) =>
          typeof row.guardrail === "string" &&
          row.guardrail.length > 10
      )
    );
  }
);

test(
  "MSE-25.246 objectives are operational and French",
  () => {
    const objective = objectivesFor({
      p1: 1,
      p2: 0,
      p3: 0,
    });

    assert.equal(
      objective.targetRank,
      10
    );

    assert.match(
      objective.primary,
      /Top 20/
    );

    assert.match(
      objective.reviewAfter,
      /relevé calibré/
    );
  }
);

test(
  "MSE-25.246 keeps action-plan computation read only",
  () => {
    const plan =
      buildTerritorialActionPlan({
        campaignId: 11,
        agencyId: 6,
        city: "Bois-Colombes",
        byCity: {
          "Levallois-Perret": {
            cells: 2,
            p1: 2,
            p2: 0,
            p3: 0,
            averageRank: 61,
          },
        },
        cells: [
          {
            row: 4,
            col: 3,
            rank: 63,
            priority: "p1",
            latitude: 48.9,
            longitude: 2.28,
            territory: {
              city: "Levallois-Perret",
            },
          },
        ],
      });

    assert.equal(
      plan.mode,
      "read_only"
    );
    assert.equal(
      plan.databaseWrites,
      0
    );
    assert.equal(
      plan.providerCalls,
      0
    );
    assert.equal(
      plan.executionTriggered,
      false
    );

    assert.equal(
      plan.summary.topPriorityCity,
      "Levallois-Perret"
    );

    assert.match(
      plan.doorwayGuard,
      /fausse implantation/
    );
  }
);
