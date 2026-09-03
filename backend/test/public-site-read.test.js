"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  PublicSiteReadService,
  normalizeSlug,
  publishedLike,
  normalizeBlock,
  normalizePage,
  destinationSlugFromItem,
  collectDestinationSlugs,
  enrichDestinationItem,
  enrichPagesWithDestinations,
} = require(
  "../src/modules/public-site-read"
);

const {
  normalizePublicPage,
} = require(
  "../src/modules/public-site-read/section-aware-service"
);

test(
  "normalise un slug",
  () => {
    assert.equal(
      normalizeSlug(
        "/agence-test/"
      ),
      "agence-test"
    );
  }
);

test(
  "reconnaît un statut publié",
  () => {
    assert.equal(
      publishedLike({
        status:
          "published",
      }),
      true
    );

    assert.equal(
      publishedLike({
        status:
          "draft",
      }),
      false
    );
  }
);

test(
  "normalise un bloc",
  () => {
    const result =
      normalizeBlock({
        id:
          "b1",

        blockType:
          "hero",

        content: {
          title:
            "Voyage",
        },

        displayOrder:
          1,
      });

    assert.equal(
      result.type,
      "hero"
    );

    assert.equal(
      result.content.title,
      "Voyage"
    );
  }
);

test(
  "normalise une page",
  () => {
    const result =
      normalizePage({
        id:
          "p1",

        slug:
          "accueil",

        title:
          "Accueil",

        status:
          "published",

        blocks:
          [],
      });

    assert.equal(
      result.published,
      true
    );

    assert.equal(
      result.slug,
      "accueil"
    );
  }
);

test(
  "une page publiée expose ses blocs V2 même si leur statut technique est draft",
  () => {
    const result = normalizePage({
      id: "home",
      slug: "home",
      title: "Accueil",
      status: "published",
      published: true,
      blocks: [
        {
          id: "hero-1",
          blockType: "hero",
          status: "draft",
          displayOrder: 0,
          content: {
            title: "Agence de voyages",
          },
        },
        {
          id: "cta-1",
          blockType: "cta",
          status: "draft",
          displayOrder: 1,
          content: {
            title: "Construisons votre voyage",
          },
        },
      ],
    });

    assert.equal(result.published, true);
    assert.equal(result.blocks.length, 2);
    assert.deepEqual(
      result.blocks.map((block) => block.type),
      ["hero", "cta"]
    );
    assert.deepEqual(
      result.blocks.map((block) => block.status),
      ["draft", "draft"]
    );
  }
);

test(
  "le service section-aware conserve les blocs V2 draft d'une page publiée",
  () => {
    const result = normalizePublicPage({
      id: "home-section-aware",
      slug: "",
      title: "Accueil",
      status: "published",
      published: true,
      blocks: [
        {
          id: "hero-section-aware",
          blockType: "hero",
          status: "draft",
          displayOrder: 0,
          content: {
            title: "Agence de voyages",
          },
        },
        {
          id: "cta-section-aware",
          blockType: "cta",
          status: "draft",
          displayOrder: 1,
          content: {
            title: "Construisons votre voyage",
          },
        },
      ],
      sections: [],
    });

    assert.equal(result.published, true);
    assert.equal(result.contentSource, "website-designer-v2-blocks");
    assert.equal(result.blocks.length, 2);
    assert.deepEqual(
      result.blocks.map((block) => block.type),
      ["hero", "cta"]
    );
  }
);

test(
  "une page non publiée ne rend pas publics ses blocs draft via le normalizer",
  () => {
    const result = normalizePage({
      id: "draft-page",
      slug: "brouillon",
      title: "Brouillon",
      status: "draft",
      published: false,
      blocks: [
        {
          id: "hero-draft",
          blockType: "hero",
          status: "draft",
          displayOrder: 0,
          content: {},
        },
      ],
    });

    assert.equal(result.published, false);
    assert.equal(result.blocks.length, 0);
  }
);

test(
  "extrait le slug Travel Core depuis les liens de destination",
  () => {
    assert.equal(destinationSlugFromItem({ href: "/destinations/ile-maurice" }), "ile-maurice");
    assert.equal(destinationSlugFromItem({ slug: "seychelles" }), "seychelles");
  }
);

test(
  "collecte les destinations utilisées par les blocs V2",
  () => {
    const slugs = collectDestinationSlugs([
      {
        blocks: [
          {
            type: "destination-grid",
            content: {
              items: [
                { href: "/destinations/ile-maurice" },
                { href: "/destinations/maldives" },
              ],
            },
          },
        ],
      },
    ]);

    assert.deepEqual(slugs.sort(), ["ile-maurice", "maldives"]);
  }
);

test(
  "enrichit une destination V2 avec Travel Core sans écraser les données locales",
  () => {
    const result = enrichDestinationItem(
      {
        href: "/destinations/ile-maurice",
        title: "Île Maurice",
      },
      {
        id: "destination-1",
        slug: "ile-maurice",
        name: "Île Maurice",
        tagline: "Lagons et douceur de vivre",
        summary: "Résumé Travel Core",
        heroImageUrl: "https://images.example.test/maurice.jpg",
      }
    );

    assert.equal(result.title, "Île Maurice");
    assert.equal(result.slug, "ile-maurice");
    assert.equal(result.image, "https://images.example.test/maurice.jpg");
    assert.equal(result.description, "Lagons et douceur de vivre");
    assert.equal(result.travelCoreId, "destination-1");
  }
);

test(
  "enrichit uniquement les destinations connues et conserve les destinations absentes",
  () => {
    const pages = enrichPagesWithDestinations(
      [
        {
          id: "home",
          blocks: [
            {
              id: "destinations",
              type: "destination-grid",
              content: {
                title: "Nos idées de destinations",
                items: [
                  { href: "/destinations/ile-maurice", title: "Île Maurice" },
                  { href: "/destinations/canaries", title: "Canaries" },
                ],
              },
            },
          ],
        },
      ],
      [
        {
          id: "destination-1",
          slug: "ile-maurice",
          name: "Île Maurice",
          tagline: "Lagons et douceur de vivre",
          heroImageUrl: "https://images.example.test/maurice.jpg",
        },
      ]
    );

    const items = pages[0].blocks[0].content.items;
    assert.equal(items[0].image, "https://images.example.test/maurice.jpg");
    assert.equal(items[0].travelCoreId, "destination-1");
    assert.deepEqual(items[1], { href: "/destinations/canaries", title: "Canaries" });
    assert.equal(pages[0].blocks[0].content.__dataSource, "travel-core");
  }
);

test(
  "le contrat public utilise le chemin canonique /agence et reconnaît l'accueil au slug vide",
  async () => {
    const prisma = {
      agencySite: {
        async findFirst() {
          return {
            id:
              "site-1",

            agencyId:
              6,

            tenantId:
              "tenant-1",

            slug:
              "ozoir-la-ferriere",

            name:
              "Mondescale Ozoir",

            basePath:
              "/sites/ozoir-la-ferriere",

            status:
              "published",

            publishedAt:
              new Date(),

            theme:
              "mondescale-default",

            agency: {
              id:
                6,

              name:
                "Mondescale Ozoir",

              tenantId:
                "tenant-1",

              city:
                "Ozoir-la-Ferrière",

              address:
                "1 rue du Test",

              postalCode:
                "77330",

              phone:
                "0100000000",

              email:
                "ozoir@example.test",
            },

            pages: [
              {
                id:
                  "home",

                slug:
                  "",

                title:
                  "Accueil",

                status:
                  "published",

                published:
                  true,

                displayOrder:
                  0,

                blocks: [
                  {
                    id: "hero-home",
                    blockType: "hero",
                    status: "draft",
                    displayOrder: 0,
                    content: {
                      title: "Mondescale Ozoir",
                    },
                  },
                ],
              },
              {
                id:
                  "contact",

                slug:
                  "contact",

                title:
                  "Contact",

                status:
                  "published",

                published:
                  true,

                displayOrder:
                  10,

                blocks:
                  [],
              },
            ],
          };
        },
      },
    };

    const service =
      new PublicSiteReadService({
        prisma,
      });

    const result =
      await service.bySlug(
        "ozoir-la-ferriere"
      );

    assert.equal(
      result.homePage.id,
      "home"
    );

    assert.equal(result.homePage.blocks.length, 1);
    assert.equal(result.homePage.blocks[0].type, "hero");

    assert.equal(
      result.site.basePath,
      "/agence/ozoir-la-ferriere"
    );

    assert.deepEqual(
      result.navigation.map(
        (item) => item.path
      ),
      [
        "/agence/ozoir-la-ferriere",
        "/agence/ozoir-la-ferriere/contact",
      ]
    );
  }
);
