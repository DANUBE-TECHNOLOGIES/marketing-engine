"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SiteReadinessClient,
  normalizeLaunchReadiness,
} = require("../src/modules/site-publication/readiness-client");

test("publication accepts a ready site below score 100 when no required check is missing", () => {
  const readiness = normalizeLaunchReadiness({
    site: {
      id: "melun-site",
      slug: "tui-store-melun",
    },
    readiness: {
      score: 90,
      grade: "A",
      ready: true,
      blockers: [],
    },
    launchState: {
      code: "ready_to_publish",
    },
    checks: [
      {
        code: "CONTENT",
        label: "Contenu",
        required: true,
        passed: true,
      },
      {
        code: "LEGAL",
        label: "Informations légales",
        required: true,
        passed: true,
      },
    ],
  });

  assert.equal(readiness.score, 90);
  assert.equal(readiness.ready, true);
  assert.equal(readiness.summary.missing, 0);

  const client = new SiteReadinessClient({
    backendOrigin: "http://127.0.0.1:4000",
  });

  assert.equal(client.assertReady(readiness), true);
});

test("publication still rejects a site with a required blocker", () => {
  const readiness = normalizeLaunchReadiness({
    site: {
      id: "amilly-site",
      slug: "tui-store-amilly",
    },
    readiness: {
      score: 75,
      grade: "B",
      ready: false,
      blockers: [
        {
          code: "LEGAL",
          label: "Informations légales",
        },
      ],
    },
    launchState: {
      code: "to_complete",
    },
    checks: [
      {
        code: "LEGAL",
        label: "Informations légales",
        required: true,
        passed: false,
      },
    ],
  });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.summary.missing, 1);

  const client = new SiteReadinessClient({
    backendOrigin: "http://127.0.0.1:4000",
  });

  assert.throws(
    () => client.assertReady(readiness),
    (error) =>
      error &&
      error.code === "SITE_NOT_READY" &&
      error.details?.missing === 1
  );
});
