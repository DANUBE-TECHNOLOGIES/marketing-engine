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
  SitePublicationLockManager,
} =
  require(
    "../src/modules/site-publication/lock-manager"
  );

const {
  progressPercentage,
} =
  require(
    "../src/modules/site-publication/service"
  );

test(
  "calcule le pourcentage de progression",
  () => {
    assert.equal(
      progressPercentage({
        total:
          12,

        processed:
          7,

        skipped:
          0,

        failed:
          0,
      }),
      58
    );

    assert.equal(
      progressPercentage({
        total:
          12,

        processed:
          8,

        skipped:
          4,

        failed:
          0,
      }),
      100
    );

    assert.equal(
      progressPercentage({
        total:
          0,

        processed:
          0,

        skipped:
          0,

        failed:
          0,
      }),
      0
    );
  }
);

test(
  "met à jour une opération active",
  () => {
    const manager =
      new SitePublicationLockManager();

    manager.acquire(
      "site-1",
      "publish"
    );

    const updated =
      manager.update(
        "site-1",
        {
          stage:
            "publishing",

          progress: {
            total:
              12,

            processed:
              7,

            percentage:
              58,

            currentPage: {
              slug:
                "contact",
            },
          },
        }
      );

    assert.equal(
      updated.stage,
      "publishing"
    );

    assert.equal(
      updated.progress.total,
      12
    );

    assert.equal(
      updated.progress.processed,
      7
    );

    assert.equal(
      updated.progress.percentage,
      58
    );

    assert.equal(
      updated.progress.currentPage.slug,
      "contact"
    );

    assert.ok(
      updated.updatedAt
    );
  }
);

test(
  "une mise à jour sans verrou retourne null",
  () => {
    const manager =
      new SitePublicationLockManager();

    assert.equal(
      manager.update(
        "site-absent",
        {
          stage:
            "publishing",
        }
      ),
      null
    );
  }
);
