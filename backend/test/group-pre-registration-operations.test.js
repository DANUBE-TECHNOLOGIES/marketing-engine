"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  OPERATIONAL_STATUSES,
  buildOperationalAnalytics,
  validateAllocation,
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
