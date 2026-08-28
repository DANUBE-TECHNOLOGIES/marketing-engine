"use strict";

const crypto =
  require(
    "node:crypto"
  );


const {
  normalizeSitePublicationError,
  sitePublicationError,
} =
  require(
    "./errors"
  );

function actorFromHeaders(
  headers = {}
) {
  return {
    id:
      headers[
        "x-user-id"
      ] ||
      null,

    name:
      headers[
        "x-user-name"
      ] ||
      null,
  };
}

function durationMs(
  startedAt
) {
  return (
    Date.now() -
    startedAt
  );
}


function sitePublicationHeaderValue(
  headers,
  name
) {
  if (
    !headers ||
    typeof headers !==
      "object"
  ) {
    return "";
  }

  const expectedName =
    String(
      name
    ).toLowerCase();

  for (
    const [
      key,
      value,
    ]
    of Object.entries(
      headers
    )
  ) {
    if (
      String(
        key
      ).toLowerCase() !==
      expectedName
    ) {
      continue;
    }

    if (
      Array.isArray(
        value
      )
    ) {
      return String(
        value[0] ||
        ""
      );
    }

    return String(
      value ||
      ""
    );
  }

  return "";
}

function sitePublicationSecureTokenMatches(
  expected,
  received
) {
  const expectedBuffer =
    Buffer.from(
      String(
        expected ||
        ""
      ),
      "utf8"
    );

  const receivedBuffer =
    Buffer.from(
      String(
        received ||
        ""
      ),
      "utf8"
    );

  return (
    expectedBuffer.length >
      0 &&
    expectedBuffer.length ===
      receivedBuffer.length &&
    crypto.timingSafeEqual(
      expectedBuffer,
      receivedBuffer
    )
  );
}

function assertSitePublicationForceAuthorized(
  headers
) {
  const expectedToken =
    String(
      process.env
        .SITE_PUBLICATION_FORCE_TOKEN ||
      ""
    ).trim();

  if (!expectedToken) {
    throw sitePublicationError(
      "SITE_PUBLICATION_FORCE_DISABLED",
      "La publication forcée n’est pas configurée sur ce serveur.",
      503
    );
  }

  const receivedToken =
    sitePublicationHeaderValue(
      headers,
      "x-site-publication-force-token"
    ).trim();

  if (
    !sitePublicationSecureTokenMatches(
      expectedToken,
      receivedToken
    )
  ) {
    throw sitePublicationError(
      "SITE_PUBLICATION_FORCE_FORBIDDEN",
      "La publication forcée nécessite une autorisation technique valide.",
      403
    );
  }
}

function publicationPlanSnapshot({
  site,
  readiness,
}) {
  return {
    site: {
      id:
        String(
          site.id
        ),

      slug:
        String(
          site.slug ||
          ""
        ),

      status:
        String(
          site.status ||
          ""
        ),

      publishedAt:
        site.publishedAt
          ? new Date(
              site.publishedAt
            ).toISOString()
          : null,
    },

    readiness: {
      score:
        Number(
          readiness?.score ||
          0
        ),

      missing:
        Number(
          readiness?.summary
            ?.missing ||
          0
        ),

      failedChecks:
        (
          readiness?.checks ||
          []
        )
          .filter(
            (check) =>
              check.required &&
              !check.ready
          )
          .map(
            (check) =>
              String(
                check.id
              )
          )
          .sort(),
    },

    pages:
      (
        site.pages ||
        []
      ).map(
        (page) => ({
          id:
            String(
              page.id
            ),

          slug:
            String(
              page.slug ||
              ""
            ),

          status:
            String(
              page.status ||
              ""
            ),

          published:
            Boolean(
              page.published
            ),

          updatedAt:
            page.updatedAt
              ? new Date(
                  page.updatedAt
                ).toISOString()
              : null,
        })
      ),
  };
}

function publicationPlanToken({
  site,
  readiness,
}) {
  const snapshot =
    publicationPlanSnapshot({
      site,
      readiness,
    });

  return crypto
    .createHash(
      "sha256"
    )
    .update(
      JSON.stringify(
        snapshot
      )
    )
    .digest(
      "hex"
    );
}

function progressPercentage({
  total,
  processed,
  skipped,
  failed,
}) {
  const normalizedTotal =
    Number(
      total ||
      0
    );

  if (!normalizedTotal) {
    return 0;
  }

  const completed =
    Number(
      processed ||
      0
    ) +
    Number(
      skipped ||
      0
    ) +
    Number(
      failed ||
      0
    );

  return Math.min(
    100,
    Math.round(
      (
        completed /
        normalizedTotal
      ) *
      100
    )
  );
}

class SitePublicationService {
  constructor({
    repository,
    readinessClient,
    pagePublicationClient,
    historyStore,
    lockManager,
  }) {
    this.repository =
      repository;

    this.readinessClient =
      readinessClient;

    this.pagePublicationClient =
      pagePublicationClient;

    this.historyStore =
      historyStore;

    this.lockManager =
      lockManager;
  }

  async status(
    siteId
  ) {
    const status =
      await this.repository.status(
        siteId
      );

    return {
      ...status,

      operation:
        this.lockManager.current(
          siteId
        ),

      latestHistory:
        await this.historyStore.latest(
          siteId
        ),
    };
  }

  async history(
    siteId,
    options
  ) {
    await this.repository.site(
      siteId
    );

    return this.historyStore.list(
      siteId,
      options
    );
  }

  async plan({
    siteId,
    headers,
  }) {
    const site =
      await this.repository.site(
        siteId
      );

    if (!site.pages.length) {
      throw sitePublicationError(
        "SITE_HAS_NO_PAGES",
        "Le mini-site ne contient aucune page à publier.",
        409,
        {
          siteId,
        }
      );
    }

    const readiness =
      await this.readinessClient.check({
        agencyId:
          site.agencyId,

        siteSlug:
          site.slug,

        headers,
      });

    const failedChecks =
      (
        readiness?.checks ||
        []
      )
        .filter(
          (check) =>
            check.required &&
            !check.ready
        )
        .map(
          (check) => ({
            id:
              check.id,

            label:
              check.label,

            category:
              check.category,

            action:
              check.action,
          })
        );

    const pages =
      site.pages.map(
        (
          page,
          index
        ) => {
          const published =
            page.published ||
            String(
              page.status ||
              ""
            ).toLowerCase() ===
              "published";

          return {
            sequence:
              index + 1,

            pageId:
              page.id,

            slug:
              page.slug,

            title:
              page.title,

            currentStatus:
              page.status,

            published,

            action:
              published
                ? "skip"
                : "publish",

            reason:
              published
                ? "already-published"
                : "ready-for-publication",
          };
        }
      );

    const score =
      Number(
        readiness?.score ||
        0
      );

    const missing =
      Number(
        readiness?.summary
          ?.missing ||
        0
      );

    const ready =
      missing === 0 &&
      failedChecks.length === 0;

    return {
      generatedAt:
        new Date()
          .toISOString(),

      planToken:
        publicationPlanToken({
          site,
          readiness,
        }),

      site: {
        id:
          site.id,

        slug:
          site.slug,

        name:
          site.name,

        status:
          site.status,

        publishedAt:
          site.publishedAt,

        agencyId:
          site.agencyId,
      },

      readiness: {
        score,

        missing,

        status:
          readiness?.status ||
          null,

        ready,

        failedChecks,
      },

      pages: {
        total:
          pages.length,

        toPublish:
          pages.filter(
            (page) =>
              page.action ===
              "publish"
          ).length,

        skipped:
          pages.filter(
            (page) =>
              page.action ===
              "skip"
          ).length,

        items:
          pages,
      },

      executable:
        ready,

      idempotent:
        pages.every(
          (page) =>
            page.action ===
            "skip"
        ),

      blockers: [
        ...(
          ready
            ? []
            : [
                {
                  code:
                    "SITE_NOT_READY",

                  message:
                    "Tous les critères obligatoires doivent être validés.",
                },
              ]
        ),

        ...(
          pages.length
            ? []
            : [
                {
                  code:
                    "SITE_HAS_NO_PAGES",

                  message:
                    "Le mini-site ne contient aucune page.",
                },
              ]
        ),
      ],
    };
  }

  async publish({
    siteId,
    headers,
    force = false,
    planToken = null,
  }) {

    if (force) {
      assertSitePublicationForceAuthorized(
        headers
      );
    }

    const lock =
      this.lockManager.acquire(
        siteId,
        "publish"
      );

    const startedAt =
      Date.now();

    const actor =
      actorFromHeaders(
        headers
      );

    const completed = [];
    const skipped = [];
    const rollback = [];

    let site = null;
    let readiness = null;

    try {
      site =
        await this.repository.site(
          siteId
        );

      this.lockManager.update(
        siteId,
        {
          stage:
            "checking-readiness",

          progress: {
            total:
              site.pages.length,

            processed:
              0,

            skipped:
              0,

            failed:
              0,

            percentage:
              0,

            currentPage:
              null,
          },
        }
      );

      if (!site.pages.length) {
        throw sitePublicationError(
          "SITE_HAS_NO_PAGES",
          "Le mini-site ne contient aucune page à publier.",
          409,
          {
            siteId,
          }
        );
      }

      if (!force) {
        readiness =
          await this.readinessClient.check({
            agencyId:
              site.agencyId,

            siteSlug:
              site.slug,

            headers,
          });

        this.readinessClient
          .assertReady(
            readiness
          );

        if (
          !String(
            planToken ||
            ""
          ).trim()
        ) {
          throw sitePublicationError(
            "PUBLICATION_PLAN_TOKEN_REQUIRED",
            "Le plan de publication doit être validé avant la mise en ligne.",
            428,
            {
              siteId:
                site.id,
            }
          );
        }

        const expectedPlanToken =
          publicationPlanToken({
            site,
            readiness,
          });

        const receivedPlanToken =
          String(
            planToken
          );

        const expectedBuffer =
          Buffer.from(
            expectedPlanToken,
            "utf8"
          );

        const receivedBuffer =
          Buffer.from(
            receivedPlanToken,
            "utf8"
          );

        const tokenMatches =
          expectedBuffer.length ===
            receivedBuffer.length &&
          crypto.timingSafeEqual(
            expectedBuffer,
            receivedBuffer
          );

        if (!tokenMatches) {
          throw sitePublicationError(
            "PUBLICATION_PLAN_STALE",
            "Le plan de publication n’est plus à jour. Actualisez-le avant de publier.",
            409,
            {
              siteId:
                site.id,

              expectedPlanToken,
            }
          );
        }
      }

      this.lockManager.update(
        siteId,
        {
          stage:
            "publishing",
        }
      );

      for (
        const page
        of site.pages
      ) {
        this.lockManager.update(
          siteId,
          {
            progress: {
              currentPage: {
                pageId:
                  page.id,

                slug:
                  page.slug,

                title:
                  page.title,
              },
            },
          }
        );
        const alreadyPublished =
          page.published ||
          String(
            page.status || ""
          ).toLowerCase() ===
            "published";

        if (alreadyPublished) {
          skipped.push({
            pageId:
              page.id,

            slug:
              page.slug,

            reason:
              "already-published",
          });

          this.lockManager.update(
            siteId,
            {
              progress: {
                skipped:
                  skipped.length,

                percentage:
                  progressPercentage({
                    total:
                      site.pages.length,

                    processed:
                      completed.length,

                    skipped:
                      skipped.length,

                    failed:
                      0,
                  }),
              },
            }
          );

          continue;
        }

        const result =
          await this.pagePublicationClient
            .publish({
              pageId:
                page.id,

              headers,

              body: {
                source:
                  "site-publication-orchestrator",

                siteId:
                  site.id,

                siteSlug:
                  site.slug,

                actor,
              },
            });

        completed.push({
          pageId:
            page.id,

          slug:
            page.slug,

          title:
            page.title,

          result,
        });

        this.lockManager.update(
          siteId,
          {
            progress: {
              processed:
                completed.length,

              skipped:
                skipped.length,

              percentage:
                progressPercentage({
                  total:
                    site.pages.length,

                  processed:
                    completed.length,

                  skipped:
                    skipped.length,

                  failed:
                    0,
                }),
            },
          }
        );
      }

      this.lockManager.update(
        siteId,
        {
          stage:
            "finalizing",

          progress: {
            currentPage:
              null,
          },
        }
      );

      await this.repository
        .markSitePublished(
          site.id
        );

      const record =
        await this.historyStore.append(
          site.id,
          {
            operation:
              "publish",

            outcome:
              "success",

            actor,

            siteSlug:
              site.slug,

            startedAt:
              lock.startedAt,

            completedAt:
              new Date()
                .toISOString(),

            durationMs:
              durationMs(
                startedAt
              ),

            readiness: {
              score:
                readiness?.score ??
                null,

              status:
                readiness?.status ??
                null,
            },

            pages: {
              total:
                site.pages.length,

              processed:
                completed.length,

              skipped:
                skipped.length,

              failed:
                0,
            },

            completed:
              completed.map(
                (entry) => ({
                  pageId:
                    entry.pageId,

                  slug:
                    entry.slug,

                  title:
                    entry.title,
                })
              ),

            skipped,
          }
        );

      return {
        success:
          true,

        idempotent:
          completed.length === 0,

        site: {
          id:
            site.id,

          slug:
            site.slug,

          status:
            "published",
        },

        readiness,

        progress: {
          total:
            site.pages.length,

          processed:
            completed.length,

          skipped:
            skipped.length,

          failed:
            0,

          percentage:
            100,
        },

        completed:
          completed.map(
            (entry) => ({
              pageId:
                entry.pageId,

              slug:
                entry.slug,

              title:
                entry.title,
            })
          ),

        skipped,

        history:
          record,
      };
    } catch (error) {
      const normalized =
        normalizeSitePublicationError(
          error
        );

      this.lockManager.update(
        siteId,
        {
          stage:
            "rolling-back",

          progress: {
            failed:
              1,

            percentage:
              progressPercentage({
                total:
                  site?.pages
                    ?.length ||
                  completed.length +
                  skipped.length +
                  1,

                processed:
                  completed.length,

                skipped:
                  skipped.length,

                failed:
                  1,
              }),
          },
        }
      );

      for (
        const completedPage
        of [
          ...completed,
        ].reverse()
      ) {
        this.lockManager.update(
          siteId,
          {
            progress: {
              currentPage: {
                pageId:
                  completedPage.pageId,

                slug:
                  completedPage.slug,

                title:
                  completedPage.title,
              },
            },
          }
        );
        try {
          await this.pagePublicationClient
            .unpublish({
              pageId:
                completedPage.pageId,

              headers,

              body: {
                source:
                  "site-publication-compensation",

                siteId:
                  site?.id ||
                  siteId,

                actor,
              },
            });

          rollback.push({
            pageId:
              completedPage.pageId,

            slug:
              completedPage.slug,

            outcome:
              "success",
          });
        } catch (
          rollbackError
        ) {
          rollback.push({
            pageId:
              completedPage.pageId,

            slug:
              completedPage.slug,

            outcome:
              "failed",

            error: {
              code:
                rollbackError.code ||
                rollbackError.name,

              message:
                rollbackError.message,
            },
          });
        }
      }

      if (site) {
        try {
          await this.repository
            .markSiteUnpublished(
              site.id
            );
        } catch {
          // L’erreur initiale reste prioritaire.
        }
      }

      const record =
        await this.historyStore.append(
          site?.id ||
          siteId,
          {
            operation:
              "publish",

            outcome:
              "failed",

            actor,

            siteSlug:
              site?.slug ||
              null,

            startedAt:
              lock.startedAt,

            completedAt:
              new Date()
                .toISOString(),

            durationMs:
              durationMs(
                startedAt
              ),

            readiness:
              readiness
                ? {
                    score:
                      readiness.score ??
                      null,

                    status:
                      readiness.status ??
                      null,
                  }
                : null,

            pages: {
              total:
                site?.pages
                  ?.length ||
                0,

              processed:
                completed.length,

              skipped:
                skipped.length,

              failed:
                1,
            },

            error: {
              code:
                normalized.code,

              message:
                normalized.message,

              details:
                normalized.details,
            },

            rollback,
          }
        );

      normalized.details = {
        ...normalized.details,

        rollback,

        historyId:
          record.id,
      };

      throw normalized;
    } finally {
      this.lockManager.release(
        siteId
      );
    }
  }

  async unpublish({
    siteId,
    headers,
  }) {
    const lock =
      this.lockManager.acquire(
        siteId,
        "unpublish"
      );

    const startedAt =
      Date.now();

    const actor =
      actorFromHeaders(
        headers
      );

    const completed = [];
    const skipped = [];

    let site = null;

    try {
      site =
        await this.repository.site(
          siteId
        );

      this.lockManager.update(
        siteId,
        {
          stage:
            "unpublishing",

          progress: {
            total:
              site.pages.length,

            processed:
              0,

            skipped:
              0,

            failed:
              0,

            percentage:
              0,

            currentPage:
              null,
          },
        }
      );

      for (
        const page
        of [
          ...site.pages,
        ].reverse()
      ) {
        this.lockManager.update(
          siteId,
          {
            progress: {
              currentPage: {
                pageId:
                  page.id,

                slug:
                  page.slug,

                title:
                  page.title,
              },
            },
          }
        );

        const published =
          page.published ||
          String(
            page.status || ""
          ).toLowerCase() ===
            "published";

        if (!published) {
          skipped.push({
            pageId:
              page.id,

            slug:
              page.slug,

            reason:
              "already-unpublished",
          });

          this.lockManager.update(
            siteId,
            {
              progress: {
                skipped:
                  skipped.length,

                percentage:
                  progressPercentage({
                    total:
                      site.pages.length,

                    processed:
                      completed.length,

                    skipped:
                      skipped.length,

                    failed:
                      0,
                  }),
              },
            }
          );

          continue;
        }

        await this.pagePublicationClient
          .unpublish({
            pageId:
              page.id,

            headers,

            body: {
              source:
                "site-publication-orchestrator",

              siteId:
                site.id,

              siteSlug:
                site.slug,

              actor,
            },
          });

        completed.push({
          pageId:
            page.id,

          slug:
            page.slug,

          title:
            page.title,
        });

        this.lockManager.update(
          siteId,
          {
            progress: {
              processed:
                completed.length,

              skipped:
                skipped.length,

              percentage:
                progressPercentage({
                  total:
                    site.pages.length,

                  processed:
                    completed.length,

                  skipped:
                    skipped.length,

                  failed:
                    0,
                }),
            },
          }
        );
      }

      this.lockManager.update(
        siteId,
        {
          stage:
            "finalizing",

          progress: {
            currentPage:
              null,
          },
        }
      );

      await this.repository
        .markSiteUnpublished(
          site.id
        );

      const record =
        await this.historyStore.append(
          site.id,
          {
            operation:
              "unpublish",

            outcome:
              "success",

            actor,

            siteSlug:
              site.slug,

            startedAt:
              lock.startedAt,

            completedAt:
              new Date()
                .toISOString(),

            durationMs:
              durationMs(
                startedAt
              ),

            pages: {
              total:
                site.pages.length,

              processed:
                completed.length,

              skipped:
                skipped.length,

              failed:
                0,
            },

            completed,
            skipped,
          }
        );

      return {
        success:
          true,

        idempotent:
          completed.length === 0,

        site: {
          id:
            site.id,

          slug:
            site.slug,

          status:
            "draft",
        },

        progress: {
          total:
            site.pages.length,

          processed:
            completed.length,

          skipped:
            skipped.length,

          failed:
            0,

          percentage:
            100,
        },

        completed,
        skipped,

        history:
          record,
      };
    } catch (error) {
      const normalized =
        normalizeSitePublicationError(
          error
        );

      const record =
        await this.historyStore.append(
          site?.id ||
          siteId,
          {
            operation:
              "unpublish",

            outcome:
              "failed",

            actor,

            siteSlug:
              site?.slug ||
              null,

            startedAt:
              lock.startedAt,

            completedAt:
              new Date()
                .toISOString(),

            durationMs:
              durationMs(
                startedAt
              ),

            pages: {
              total:
                site?.pages
                  ?.length ||
                0,

              processed:
                completed.length,

              skipped:
                skipped.length,

              failed:
                1,
            },

            error: {
              code:
                normalized.code,

              message:
                normalized.message,

              details:
                normalized.details,
            },
          }
        );

      normalized.details = {
        ...normalized.details,

        historyId:
          record.id,
      };

      throw normalized;
    } finally {
      this.lockManager.release(
        siteId
      );
    }
  }
}

module.exports = {
  sitePublicationHeaderValue,
  sitePublicationSecureTokenMatches,
  assertSitePublicationForceAuthorized,

  SitePublicationService,
  publicationPlanSnapshot,
  publicationPlanToken,
  actorFromHeaders,
  durationMs,
  progressPercentage,
};
