"use strict";

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const fs =
  require(
    "node:fs/promises"
  );

const os =
  require(
    "node:os"
  );

const path =
  require(
    "node:path"
  );

const {
  SitePublicationHistoryStore,
} =
  require(
    "../src/modules/site-publication/history-store"
  );

const {
  SitePublicationLockManager,
} =
  require(
    "../src/modules/site-publication/lock-manager"
  );

const {
  SiteReadinessClient,
} =
  require(
    "../src/modules/site-publication/readiness-client"
  );

const {
  SitePublicationService,
  publicationPlanToken,
} =
  require(
    "../src/modules/site-publication/service"
  );

test(
  "le verrou refuse deux opérations simultanées",
  () => {
    const manager =
      new SitePublicationLockManager();

    manager.acquire(
      "site-1",
      "publish"
    );

    assert.throws(
      () =>
        manager.acquire(
          "site-1",
          "unpublish"
        ),
      (
        error
      ) =>
        error.code ===
        "SITE_PUBLICATION_ALREADY_RUNNING"
    );

    manager.release(
      "site-1"
    );

    assert.equal(
      manager.isLocked(
        "site-1"
      ),
      false
    );
  }
);

test(
  "le verrou Readiness impose 100 %",
  () => {
    const client =
      new SiteReadinessClient({
        frontendOrigin:
          "http://frontend.test",
      });

    assert.throws(
      () =>
        client.assertReady({
          score:
            92,

          summary: {
            missing:
              1,
          },

          checks: [
            {
              id:
                "logo",

              label:
                "Logo",

              category:
                "Médias",

              required:
                true,

              ready:
                false,
            },
          ],
        }),
      (
        error
      ) =>
        error.code ===
        "SITE_NOT_READY"
    );

    assert.equal(
      client.assertReady({
        score:
          100,

        summary: {
          missing:
            0,
        },
      }),
      true
    );
  }
);

test(
  "l’historique JSONL est persistant",
  async () => {
    const directory =
      await fs.mkdtemp(
        path.join(
          os.tmpdir(),
          "site-publication-"
        )
      );

    const store =
      new SitePublicationHistoryStore({
        storageDirectory:
          directory,
      });

    await store.append(
      "site-1",
      {
        operation:
          "publish",

        outcome:
          "success",
      }
    );

    const items =
      await store.list(
        "site-1"
      );

    assert.equal(
      items.length,
      1
    );

    assert.equal(
      items[0].operation,
      "publish"
    );
  }
);

test(
  "la publication compense les pages déjà traitées",
  async () => {
    const published = [];
    const unpublished = [];
    const history = [];

    const simulatedSite = {
      id:
        "site-1",

      agencyId:
        6,

      slug:
        "pilote",

      status:
        "draft",

      publishedAt:
        null,

      pages: [
        {
          id:
            "page-1",

          slug:
            "accueil",

          title:
            "Accueil",

          published:
            false,

          status:
            "draft",

          updatedAt:
            new Date(
              "2026-08-06T12:00:00.000Z"
            ),
        },

        {
          id:
            "page-2",

          slug:
            "agence",

          title:
            "Agence",

          published:
            false,

          status:
            "draft",

          updatedAt:
            new Date(
              "2026-08-06T12:01:00.000Z"
            ),
        },
      ],
    };

    const simulatedReadiness = {
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
    };

    const validPlanToken =
      publicationPlanToken({
        site:
          simulatedSite,

        readiness:
          simulatedReadiness,
      });

    const service =
      new SitePublicationService({
        repository: {
          async site() {
            return simulatedSite;
          },

          async markSitePublished() {
            throw new Error(
              "Ne doit pas être appelée"
            );
          },

          async markSiteUnpublished() {
            return true;
          },
        },

        readinessClient: {
          async check() {
            return simulatedReadiness;
          },

          assertReady() {
            return true;
          },
        },

        pagePublicationClient: {
          async publish({
            pageId,
          }) {
            published.push(
              pageId
            );

            if (
              pageId ===
              "page-2"
            ) {
              const error =
                new Error(
                  "Échec page 2"
                );

              error.code =
                "PAGE_PUBLICATION_FAILED";

              error.statusCode =
                500;

              error.details = {};

              throw error;
            }

            return {
              pageId,
            };
          },

          async unpublish({
            pageId,
          }) {
            unpublished.push(
              pageId
            );

            return {
              pageId,
            };
          },
        },

        historyStore: {
          async append(
            siteId,
            record
          ) {
            history.push(
              record
            );

            return {
              id:
                "history-1",

              siteId,

              ...record,
            };
          },
        },

        lockManager:
          new SitePublicationLockManager(),
      });

    await assert.rejects(
      () =>
        service.publish({
          siteId:
            "site-1",

          headers:
            {},

          planToken:
            validPlanToken,
        }),
      (
        error
      ) =>
        error.code ===
        "PAGE_PUBLICATION_FAILED"
    );

    assert.deepEqual(
      published,
      [
        "page-1",
        "page-2",
      ]
    );

    assert.deepEqual(
      unpublished,
      [
        "page-1",
      ]
    );

    assert.equal(
      history[0].outcome,
      "failed"
    );

    assert.equal(
      history[0]
        .rollback[0]
        .outcome,
      "success"
    );
  }
);
