"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  OPERATIONAL_STATUSES,
  GROUP_CAMPAIGN_STATUSES,
  buildCampaignPilot,
  buildOperationalAnalytics,
  validateAllocation,
  buildAnalytics,
} = require(
  "../src/modules/group-pre-registration"
);

test(
  "V1.2 exposes the operational lifecycle",
  () => {
    assert.deepEqual(
      OPERATIONAL_STATUSES,
      [
        "NEW",
        "CONTACTED",
        "QUALIFIED",
        "OPTION",
        "CONFIRMED",
        "CLOSED",
      ]
    );
  }
);

test(
  "allocation remains inside compatibility",
  () => {
    const row = {
      departures: [
        "2027-01-16",
        "2027-01-23",
      ],
      origins: [
        "PARIS",
        "LYON",
      ],
    };

    assert.deepEqual(
      validateAllocation(
        row,
        "2027-01-16",
        "PARIS"
      ),
      { ok: true }
    );

    assert.equal(
      validateAllocation(
        row,
        "2027-01-02",
        "PARIS"
      ).error,
      "ALLOCATION_OUTSIDE_SELECTED_DEPARTURES"
    );

    assert.equal(
      validateAllocation(
        row,
        "2027-01-16",
        "MARSEILLE"
      ).error,
      "INVALID_ALLOCATED_ORIGIN"
    );
  }
);

test(
  "option and confirmed volumes stay separate",
  () => {
    const rows = [
      {
        travellerCount: 4,
        status: "OPTION",
        allocatedDeparture:
          "2027-01-16",
        allocatedOrigin: "PARIS",
        nextActionAt: null,
      },
      {
        travellerCount: 2,
        status: "CONFIRMED",
        allocatedDeparture:
          "2027-01-16",
        allocatedOrigin: "PARIS",
        nextActionAt: null,
      },
      {
        travellerCount: 3,
        status: "QUALIFIED",
        allocatedDeparture: null,
        allocatedOrigin: null,
        nextActionAt: null,
      },
    ];

    const result =
      buildOperationalAnalytics(rows);

    assert.equal(
      result.allocation
        .allocatedTravellers,
      6
    );

    assert.equal(
      result.allocation.optionTravellers,
      4
    );

    assert.equal(
      result.allocation
        .confirmedTravellers,
      2
    );

    assert.equal(
      result.allocation.matrix[
        "2027-01-16"
      ].PARIS.optionTravellers,
      4
    );

    assert.equal(
      result.allocation.matrix[
        "2027-01-16"
      ].PARIS.confirmedTravellers,
      2
    );

    assert.equal(
      result.statuses.QUALIFIED
        .travellers,
      3
    );
  }
);

test(
  "multi-compatible prospect is allocated once",
  () => {
    const rows = [
      {
        travellerCount: 5,
        status: "CONFIRMED",
        departures: [
          "2027-01-09",
          "2027-01-16",
          "2027-01-23",
        ],
        origins: [
          "PARIS",
          "LYON",
        ],
        allocatedDeparture:
          "2027-01-16",
        allocatedOrigin: "LYON",
        nextActionAt: null,
      },
    ];

    const result =
      buildOperationalAnalytics(rows);

    assert.equal(
      result.allocation
        .allocatedTravellers,
      5
    );

    assert.equal(
      result.allocation
        .confirmedTravellers,
      5
    );

    assert.equal(
      result.allocation.matrix[
        "2027-01-16"
      ].LYON.confirmedTravellers,
      5
    );

    assert.equal(
      result.allocation.matrix[
        "2027-01-09"
      ].LYON.confirmedTravellers,
      0
    );
  }
);


test("V1.3 capacity counts only OPTION and CONFIRMED as committed", () => {
  const rows = [
    { travellerCount: 4, status: "OPTION", allocatedDeparture: "2027-01-16", allocatedOrigin: "PARIS" },
    { travellerCount: 2, status: "CONFIRMED", allocatedDeparture: "2027-01-16", allocatedOrigin: "PARIS" },
    { travellerCount: 9, status: "QUALIFIED", allocatedDeparture: "2027-01-16", allocatedOrigin: "PARIS" },
    { travellerCount: 3, status: "CLOSED", allocatedDeparture: "2027-01-16", allocatedOrigin: "PARIS" },
  ];
  const capacities = [{ departure: "2027-01-16", origin: "PARIS", capacity: 10, target: 8 }];
  const cell = buildOperationalAnalytics(rows, capacities).allocation.matrix["2027-01-16"].PARIS;
  assert.equal(cell.optionTravellers, 4);
  assert.equal(cell.confirmedTravellers, 2);
  assert.equal(cell.committedTravellers, 6);
  assert.equal(cell.remainingCapacity, 4);
  assert.equal(cell.confirmedRemaining, 8);
  assert.equal(cell.fillRate, 0.6);
  assert.equal(cell.confirmedFillRate, 0.2);
  assert.equal(cell.target, 8);
});

test("V1.3 zero capacity has null fill rates and is not full", () => {
  const cell = buildOperationalAnalytics([
    { travellerCount: 2, status: "OPTION", allocatedDeparture: "2027-01-09", allocatedOrigin: "LYON" },
  ]).allocation.matrix["2027-01-09"].LYON;
  assert.equal(cell.capacity, 0);
  assert.equal(cell.remainingCapacity, 0);
  assert.equal(cell.fillRate, null);
  assert.equal(cell.confirmedFillRate, null);
});

test("V1.3 commercial attention is deterministic", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  const result = buildOperationalAnalytics([
    { travellerCount: 2, status: "QUALIFIED", assignedTo: null, nextActionAt: "2026-09-21T12:00:00Z" },
    { travellerCount: 1, status: "OPTION", assignedTo: "Celine", nextActionAt: "2026-09-22T16:00:00Z" },
    { travellerCount: 1, status: "CONFIRMED", assignedTo: "", nextActionAt: "2026-09-20T12:00:00Z" },
    { travellerCount: 1, status: "CLOSED", assignedTo: null, nextActionAt: "2026-09-20T12:00:00Z" },
  ], [], now);
  assert.equal(result.attention.overdueNextActions, 1);
  assert.equal(result.attention.todayNextActions, 1);
  assert.equal(result.attention.unassignedRegistrations, 2);
  assert.equal(result.attention.unallocatedQualifiedOrLater, 3);
});

test("V1.3 compatibility remains distinct from operational allocation", () => {
  const result = buildAnalytics([{
    travellerCount: 5, status: "QUALIFIED", intent: "HIGH", source: null,
    origins: ["PARIS", "LYON"], departures: ["2027-01-09", "2027-01-16"],
    preferredDeparture: "2027-01-09", allocatedDeparture: null, allocatedOrigin: null,
  }], [{ departure: "2027-01-09", origin: "PARIS", capacity: 30, target: 20 }]);
  assert.equal(result.dates["2027-01-09"].origins.PARIS.travellers, 5);
  assert.equal(result.operations.allocation.matrix["2027-01-09"].PARIS.allocatedTravellers, 0);
  assert.equal(result.operations.allocation.matrix["2027-01-09"].PARIS.capacity, 30);
});


test("V1.4 campaign pilot aggregates capacity and commercial progress", () => {
  assert.deepEqual(GROUP_CAMPAIGN_STATUSES, ["DRAFT","OPEN","GUARANTEED","FULL","CLOSED"]);
  const rows = [
    { travellerCount: 4, status: "OPTION", allocatedDeparture: "2027-01-16", allocatedOrigin: "PARIS" },
    { travellerCount: 6, status: "CONFIRMED", allocatedDeparture: "2027-01-16", allocatedOrigin: "PARIS" },
    { travellerCount: 3, status: "QUALIFIED", allocatedDeparture: "2027-01-16", allocatedOrigin: "PARIS" },
  ];
  const capacities = [
    { departure: "2027-01-16", origin: "PARIS", capacity: 20, target: 15 },
    { departure: "2027-01-23", origin: "LYON", capacity: 10, target: 8 },
  ];
  const pilot = buildCampaignPilot(rows, capacities, {
    status: "OPEN", objectiveTravellers: 25, minimumTravellers: 10, decisionDeadline: "2026-10-15T00:00:00Z",
  }, new Date("2026-09-22T12:00:00Z"));
  assert.equal(pilot.totalCapacity, 30);
  assert.equal(pilot.totalTarget, 23);
  assert.equal(pilot.optionTravellers, 4);
  assert.equal(pilot.confirmedTravellers, 6);
  assert.equal(pilot.committedTravellers, 10);
  assert.equal(pilot.remainingCapacity, 20);
  assert.equal(pilot.objectiveProgress, 0.4);
  assert.equal(pilot.minimumProgress, 0.6);
  assert.equal(pilot.alerts.some((item) => item.code === "MINIMUM_WITH_OPTIONS"), true);
});

test("V1.4 campaign pilot raises threshold and deadline alerts deterministically", () => {
  const pilot = buildCampaignPilot([
    { travellerCount: 12, status: "CONFIRMED", allocatedDeparture: "2027-01-16", allocatedOrigin: "PARIS" },
  ], [{ departure: "2027-01-16", origin: "PARIS", capacity: 13, target: 12 }], {
    status: "OPEN", objectiveTravellers: 13, minimumTravellers: 10, decisionDeadline: "2026-09-20T00:00:00Z",
  }, new Date("2026-09-22T12:00:00Z"));
  assert.equal(pilot.alerts.some((item) => item.code === "MINIMUM_REACHED"), true);
  assert.equal(pilot.alerts.some((item) => item.code === "CAPACITY_NEAR_FULL"), true);
  assert.equal(pilot.alerts.some((item) => item.code === "DECISION_DEADLINE_PASSED"), true);
});
