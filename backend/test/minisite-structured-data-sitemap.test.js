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
  "génère uniquement les URLs publiées sur le chemin canonique agence",
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
            "/agence/agence-test"
          )
      )
    );

    assert.ok(
      result.entries.some(
        (entry) =>
          entry.url.endsWith(
            "/agence/agence-test/services"
          )
      )
    );

    assert.equal(
      result.entries.some(
        (entry) =>
          entry.url.includes(
            "/sites/"
          )
      ),
      false
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

test(
  "indexe une destination uniquement pour les mini-sites qui l'exposent",
  () => {
    const result = buildPublicSitemap({
      publicOrigin: "https://agences.mondescale.com",
      sites: [
        {
          id: "site-gien",
          slug: "gien",
          status: "published",
          agency: { id: 10 },
          pages: [
            {
              id: "home-gien",
              slug: "",
              status: "published",
              blocks: [
                {
                  blockType: "destination-grid",
                  content: {
                    items: [
                      { slug: "sicile" },
                    ],
                  },
                },
              ],
            },
          ],
        },
        {
          id: "site-maurepas",
          slug: "maurepas",
          status: "published",
          agency: { id: 20 },
          pages: [
            {
              id: "home-maurepas",
              slug: "",
              status: "published",
              blocks: [
                {
                  blockType: "destinations-highlight",
                  content: {
                    destinations: [
                      { href: "/destination/maldives" },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
      destinations: [
        {
          id: "destination-sicile",
          slug: "sicile",
        },
        {
          id: "destination-maldives",
          slug: "maldives",
        },
        {
          id: "destination-japon",
          slug: "japon",
        },
      ],
    });

    const destinationEntries = result.entries.filter(
      (entry) => entry.type === "destination"
    );

    assert.deepEqual(
      destinationEntries.map((entry) => entry.url).sort(),
      [
        "https://agences.mondescale.com/agence/gien/destination/sicile",
        "https://agences.mondescale.com/agence/maurepas/destination/maldives",
      ]
    );

    assert.equal(
      destinationEntries.some((entry) =>
        entry.url.includes("/agence/gien/destination/maldives")
      ),
      false
    );

    assert.equal(
      destinationEntries.some((entry) =>
        entry.url.includes("/agence/maurepas/destination/sicile")
      ),
      false
    );

    assert.ok(
      result.excluded.some(
        (entry) =>
          entry.type === "destination" &&
          entry.destinationSlug === "japon" &&
          entry.reason === "not-exposed-by-published-site"
      )
    );
  }
);
