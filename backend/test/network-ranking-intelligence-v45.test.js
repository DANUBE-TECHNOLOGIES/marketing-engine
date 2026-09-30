"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  compareRanking,
  rankingPriority,
  buildKeywordIntelligence,
  buildAgencyIntelligence,
  buildNetworkIntelligence
} = require("../src/lib/network-ranking-intelligence");

function row({
  id,
  agencyId = 1,
  keyword = "agence de voyage",
  city = "Gien",
  found = true,
  position = 1,
  absolutePosition = position,
  checkedAt
}) {
  return {
    id,
    agencyId,
    keyword,
    city,
    found,
    position,
    absolutePosition,
    checkedAt
  };
}

test("position improvement is classified correctly", () => {
  const result = compareRanking(
    row({ position: 2 }),
    row({ position: 5 })
  );

  assert.equal(result.trend, "IMPROVING");
  assert.equal(result.positionDelta, 3);
});

test("position decline is classified correctly", () => {
  const result = compareRanking(
    row({ position: 8 }),
    row({ position: 4 })
  );

  assert.equal(result.trend, "DECLINING");
  assert.equal(result.positionDelta, -4);
});

test("lost result is critical", () => {
  const latest = row({ found: false, position: null });
  const previous = row({ found: true, position: 3 });

  const comparison = compareRanking(latest, previous);

  assert.equal(comparison.trend, "LOST");
  assert.equal(rankingPriority(latest, comparison), "CRITICAL");
});

test("newly found result is classified NEW", () => {
  const result = compareRanking(
    row({ found: true, position: 7 }),
    row({ found: false, position: null })
  );

  assert.equal(result.trend, "NEW");
  assert.equal(result.foundTransition, "FOUND");
});

test("priority boundaries are deterministic", () => {
  assert.equal(
    rankingPriority(row({ position: 1 }), {}),
    "LEADER"
  );

  assert.equal(
    rankingPriority(row({ position: 2 }), {}),
    "LOW"
  );

  assert.equal(
    rankingPriority(row({ position: 4 }), {}),
    "MEDIUM"
  );

  assert.equal(
    rankingPriority(row({ position: 6 }), {}),
    "HIGH"
  );

  assert.equal(
    rankingPriority(row({ position: 11 }), {}),
    "CRITICAL"
  );
});

test("keyword intelligence selects latest two chronologically", () => {
  const result = buildKeywordIntelligence({
    agency: { id: 3, name: "Dax", city: "Dax" },
    keyword: "agence de voyage",
    rows: [
      row({
        id: 1,
        agencyId: 3,
        city: "Dax",
        position: 1,
        checkedAt: "2026-09-01T00:00:00Z"
      }),
      row({
        id: 3,
        agencyId: 3,
        city: "Dax",
        position: 8,
        checkedAt: "2026-09-30T00:00:00Z"
      }),
      row({
        id: 2,
        agencyId: 3,
        city: "Dax",
        position: 4,
        checkedAt: "2026-09-20T00:00:00Z"
      })
    ]
  });

  assert.equal(result.latest.id, 3);
  assert.equal(result.previous.id, 2);
  assert.equal(result.positionDelta, -4);
  assert.equal(result.trend, "DECLINING");
  assert.equal(result.priority, "HIGH");
});

test("agency priority inherits highest keyword priority", () => {
  const result = buildAgencyIntelligence({
    agency: { id: 5, name: "Ozoir", city: "Ozoir" },
    rows: [
      row({
        id: 1,
        agencyId: 5,
        keyword: "agence de voyage",
        position: 1,
        checkedAt: "2026-09-30T00:00:00Z"
      }),
      row({
        id: 2,
        agencyId: 5,
        keyword: "croisière",
        found: false,
        position: null,
        checkedAt: "2026-09-30T00:00:00Z"
      })
    ]
  });

  assert.equal(result.priority, "CRITICAL");
  assert.equal(result.summary.critical, 1);
});

test("network opportunities are sorted by priority", () => {
  const result = buildNetworkIntelligence([
    {
      agency: { id: 1, name: "Leader", city: "A" },
      rows: [
        row({
          agencyId: 1,
          city: "A",
          position: 1,
          checkedAt: "2026-09-30T00:00:00Z"
        })
      ]
    },
    {
      agency: { id: 2, name: "Critical", city: "B" },
      rows: [
        row({
          agencyId: 2,
          city: "B",
          position: 15,
          checkedAt: "2026-09-30T00:00:00Z"
        })
      ]
    }
  ]);

  assert.equal(result.version, "4.5");
  assert.equal(result.summary.agencies, 2);
  assert.equal(result.opportunities[0].agencyId, 2);
  assert.equal(result.opportunities[0].priority, "CRITICAL");
});

test("analytics is deterministic", () => {
  const input = [{
    agency: { id: 1, name: "Gien", city: "Gien" },
    rows: [
      row({
        id: 2,
        position: 1,
        checkedAt: "2026-09-30T00:00:00Z"
      }),
      row({
        id: 1,
        position: 4,
        checkedAt: "2026-09-20T00:00:00Z"
      })
    ]
  }];

  assert.deepEqual(
    buildNetworkIntelligence(input),
    buildNetworkIntelligence(input)
  );
});
