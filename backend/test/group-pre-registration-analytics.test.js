"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildAnalytics,
} = require(
  "../src/modules/group-pre-registration"
);

test(
  "group analytics separates unique totals from compatibility",
  () => {
    const data = buildAnalytics([
      {
        travellerCount: 4,
        origins: ["PARIS", "LYON"],
        departures: [
          "2027-01-09",
          "2027-01-16",
          "2027-01-23",
        ],
        preferredDeparture: "2027-01-16",
        intent: "HIGH",
        source: "newsletter",
      },
      {
        travellerCount: 2,
        origins: ["PARIS"],
        departures: ["2027-01-16"],
        preferredDeparture: "2027-01-16",
        intent: "MEDIUM",
        source: null,
      },
    ]);

    assert.equal(
      data.summary.registrations,
      2
    );

    assert.equal(
      data.summary.travellers,
      6
    );

    assert.equal(
      data.summary.highIntentTravellers,
      4
    );

    assert.equal(
      data.summary.multiOriginTravellers,
      4
    );

    assert.equal(
      data.dates["2027-01-09"].travellers,
      4
    );

    assert.equal(
      data.dates["2027-01-16"].travellers,
      6
    );

    assert.equal(
      data.dates["2027-01-16"]
        .preferredTravellers,
      6
    );

    assert.equal(
      data.dates["2027-01-16"]
        .origins.PARIS.travellers,
      6
    );

    assert.equal(
      data.dates["2027-01-16"]
        .origins.LYON.travellers,
      4
    );

    /*
     * Compatibility cells may exceed unique total.
     * This is intentional and must never replace
     * summary.travellers.
     */
    const matrixTotal =
      Object.values(data.dates).reduce(
        (sum, date) =>
          sum +
          Object.values(date.origins).reduce(
            (cellSum, cell) =>
              cellSum + cell.travellers,
            0
          ),
        0
      );

    assert.ok(
      matrixTotal > data.summary.travellers
    );
  }
);
