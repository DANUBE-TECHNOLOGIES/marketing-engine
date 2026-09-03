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
  SitePublicationService,
} =
  require(
    "../src/modules/site-publication/service"
  );

function serviceWith({
  pages,
  readiness,
}) {
  return new SitePublicationService({
    repository: {
      async site() {
        return {
          id:
            "site-1",

          agencyId:
            6,

          slug:
            "site-test",

          name:
            "Site test",

          status:
            "draft",

          publishedAt:
            null,

          pages,
        };
      },
    },

    readinessClient: {
      async check() {
        return readiness;
      },
    },

    pagePublicationClient:
      {},

    historyStore:
      {},

    lockManager:
      new SitePublicationLockManager(),
  });
}

test(
  "le plan distingue les pages à publier",
  async () => {
    const service =
      serviceWith({
        pages: [
          {
            id:
              "p1",

            slug:
              "accueil",

            title:
              "Accueil",

            status:
              "published",

            published:
              true,
          },

          {
            id:
              "p2",

            slug:
              "agence",

            title:
              "Agence",

            status:
              "draft",

            published:
              false,
          },
        ],

        readiness: {
          score:
            100,

          status:
            "ready",

          summary: {
            missing:
              0,
          },

          checks:
            [],
        },
      });

    const plan =
      await service.plan({
        siteId:
          "site-1",

        headers:
          {},
      });

    assert.equal(
      plan.executable,
      true
    );

    assert.equal(
      plan.pages.total,
      2
    );

    assert.equal(
      plan.pages.toPublish,
      1
    );

    assert.equal(
      plan.pages.skipped,
      1
    );

    assert.equal(
      plan.pages.items[0]
        .action,
      "skip"
    );

    assert.equal(
      plan.pages.items[1]
        .action,
      "publish"
    );
  }
);

test(
  "le plan expose les critères bloquants",
  async () => {
    const service =
      serviceWith({
        pages: [
          {
            id:
              "p1",

            slug:
              "accueil",

            title:
              "Accueil",

            status:
              "draft",

            published:
              false,
          },
        ],

        readiness: {
          score:
            85,

          status:
            "almost-ready",

          summary: {
            missing:
              1,
          },

          checks: [
            {
              id:
                "logo",

              label:
                "Logo principal",

              category:
                "Médias",

              action:
                "media",

              required:
                true,

              ready:
                false,
            },
          ],
        },
      });

    const plan =
      await service.plan({
        siteId:
          "site-1",

        headers:
          {},
      });

    assert.equal(
      plan.executable,
      false
    );

    assert.equal(
      plan.readiness
        .failedChecks
        .length,
      1
    );

    assert.equal(
      plan.blockers[0].code,
      "SITE_NOT_READY"
    );
  }
);
