"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  buildPublicSitemap,
  isPublishedPage,
  isPublishedSite,
  shouldIndexPage,
} = require(
  "../src/modules/minisite-structured-data"
);

test(
  "reconnaît un site publié",
  () => {
    assert.equal(
      isPublishedSite({
        status:
          "published",
      }),
      true
    );

    assert.equal(
      isPublishedSite({
        status:
          "draft",
      }),
      false
    );
  }
);

test(
  "reconnaît une page publiée",
  () => {
    assert.equal(
      isPublishedPage({
        status:
          "published",
      }),
      true
    );

    assert.equal(
      isPublishedPage({
        published:
          true,
      }),
      true
    );

    assert.equal(
      isPublishedPage({
        status:
          "draft",
      }),
      false
    );
  }
);

test(
  "exclut les pages légales",
  () => {
    assert.equal(
      shouldIndexPage({
        slug:
          "mentions-legales",

        status:
          "published",
      }),
      false
    );

    assert.equal(
      shouldIndexPage({
        slug:
          "confidentialite",

        status:
          "published",
      }),
      false
    );
  }
);

test(
  "génère uniquement les URLs publiées",
  () => {
    const result =
      buildPublicSitemap({
        publicOrigin:
          "https://agences.mondescale.com",

        sites: [
          {
            id:
              "site-1",

            slug:
              "agence-test",

            status:
              "published",

            agency: {
              id:
                1,
            },

            pages: [
              {
                id:
                  "home",

                slug:
                  "",

                status:
                  "published",
              },

              {
                id:
                  "services",

                slug:
                  "services",

                status:
                  "published",
              },

              {
                id:
                  "draft",

                slug:
                  "brouillon",

                status:
                  "draft",
              },

              {
                id:
                  "legal",

                slug:
                  "mentions-legales",

                status:
                  "published",
              },
            ],
          },

          {
            id:
              "site-2",

            slug:
              "site-brouillon",

            status:
              "draft",

            pages: [],
          },
        ],
      });

    assert.equal(
      result.summary
        .publishedSites,
      1
    );

    assert.equal(
      result.entries.length,
      2
    );

    assert.ok(
      result.entries.some(
        (entry) =>
          entry.url.endsWith(
            "/sites/agence-test"
          )
      )
    );

    assert.ok(
      result.entries.some(
        (entry) =>
          entry.url.endsWith(
            "/sites/agence-test/services"
          )
      )
    );

    assert.equal(
      result.entries.some(
        (entry) =>
          entry.url.includes(
            "mentions-legales"
          )
      ),
      false
    );
  }
);

test(
  "ne génère rien pour un réseau entièrement en brouillon",
  () => {
    const result =
      buildPublicSitemap({
        publicOrigin:
          "https://agences.mondescale.com",

        sites: [
          {
            id:
              "site-1",

            slug:
              "agence-test",

            status:
              "draft",

            pages: [],
          },
        ],
      });

    assert.equal(
      result.entries.length,
      0
    );
  }
);
