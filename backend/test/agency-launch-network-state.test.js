"use strict";

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const {
  resolveLaunchState,
  summarizeLaunchStates,
} =
  require(
    "../src/modules/agency-launch/service"
  );

test(
  "sans site => À préparer",
  () => {
    assert.equal(
      resolveLaunchState({
        site:
          null,
      }).code,
      "to_prepare"
    );
  }
);

test(
  "site publié => En ligne",
  () => {
    assert.equal(
      resolveLaunchState({
        site: {
          status:
            "published",
        },

        readiness: {
          ready:
            false,
        },
      }).code,
      "online"
    );
  }
);

test(
  "site prêt non publié => Prêt à publier",
  () => {
    assert.equal(
      resolveLaunchState({
        site: {
          status:
            "draft",
        },

        readiness: {
          ready:
            true,

          blockers:
            [],
        },
      }).code,
      "ready_to_publish"
    );
  }
);

test(
  "site incomplet => À compléter",
  () => {
    assert.equal(
      resolveLaunchState({
        site: {
          status:
            "draft",
        },

        readiness: {
          ready:
            false,

          blockers: [
            {
              code:
                "CONTENT",
            },
          ],
        },
      }).code,
      "to_complete"
    );
  }
);

test(
  "summary compte les états",
  () => {
    const summary =
      summarizeLaunchStates([
        {
          launchState: {
            code:
              "to_prepare",
          },
        },
        {
          launchState: {
            code:
              "to_complete",
          },
        },
        {
          launchState: {
            code:
              "ready_to_publish",
          },
        },
        {
          launchState: {
            code:
              "online",
          },
        },
      ]);

    assert.deepEqual(
      summary,
      {
        total:
          4,

        toPrepare:
          1,

        toComplete:
          1,

        readyToPublish:
          1,

        online:
          1,
      }
    );
  }
);
