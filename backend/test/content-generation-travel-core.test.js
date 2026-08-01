"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assetTypeForChannel,
  resolveDestination,
  resolveAgency,
  createTravelCoreExecutor,
} = require(
  "../src/modules/content-generation"
);

test(
  "assetTypeForChannel classe les contenus",
  () => {
    assert.equal(
      assetTypeForChannel("landing-page"),
      "seo-content"
    );

    assert.equal(
      assetTypeForChannel("newsletter"),
      "email-content"
    );

    assert.equal(
      assetTypeForChannel("facebook"),
      "social-content"
    );
  }
);

test(
  "resolveDestination retrouve la destination de la tâche",
  () => {
    const destination = {
      id: "destination-1",
      slug: "ile-maurice",
      name: "Île Maurice",
    };

    const result = resolveDestination(
      {
        key: "destination-1:landing-page",
        payload: {
          destinationId: "destination-1",
        },
      },
      {
        destinations: [
          { destination },
        ],
      }
    );

    assert.equal(
      result.name,
      "Île Maurice"
    );
  }
);

test(
  "resolveAgency utilise la première agence par défaut",
  () => {
    const agency = {
      id: 6,
      name: "Mondescale Bois-Colombes",
      city: "Bois-Colombes",
    };

    const result = resolveAgency(
      { payload: {} },
      {
        agencies: [
          { agency },
        ],
      }
    );

    assert.equal(result.id, 6);
  }
);

test(
  "Travel Core executor crée un asset review",
  async () => {
    const savedAssets = [];

    const repository = {
      upsertAssetForTask:
        async (taskId, data) => {
          const asset = {
            id: "asset-1",
            taskId,
            ...data,
          };

          savedAssets.push(asset);
          return asset;
        },
    };

    const executor =
      createTravelCoreExecutor({
        repository,
      });

    const result = await executor(
      {
        id: "task-1",
        key: "destination-1:landing-page",
        type: "seo",
        channel: "landing-page",
        payload: {
          destinationId: "destination-1",
          destinationSlug: "ile-maurice",
        },
      },
      {
        job: {
          options: {
            tone: "expert et chaleureux",
          },
        },

        campaign: {
          id: "campaign-1",
          name: "Hiver 2026",
          description: "Campagne hiver",

          agencies: [
            {
              agency: {
                id: 6,
                name:
                  "Mondescale Bois-Colombes",
                city: "Bois-Colombes",
              },
            },
          ],

          destinations: [
            {
              destination: {
                id: "destination-1",
                tenantId:
                  "tenant_mondescale",
                name: "Île Maurice",
                slug: "ile-maurice",
                type: "island",
                status: "published",
                tagline:
                  "Lagons et douceur de vivre",
                summary:
                  "Une destination de l'océan Indien.",
                country: "Maurice",
                region: null,
                seoTitle:
                  "Voyage à l'Île Maurice",
                seoDescription:
                  "Découvrez l'Île Maurice.",
                bestTime:
                  "Mai à décembre",
                idealDuration:
                  "8 à 12 jours",
                currency: "MUR",
                language: "français",
                latitude: -20.2,
                longitude: 57.5,
                highlights: [
                  "lagons",
                  "plages",
                ],
                audiences: [
                  "couples",
                  "familles",
                ],

                countryRef: {
                  id: "country-1",
                  name: "Maurice",
                  slug: "maurice",
                  iso2: "MU",
                  iso3: "MUS",
                  continent: "Afrique",
                  currency: "MUR",
                  languages: ["français"],
                  timezone:
                    "Indian/Mauritius",
                },

                regionRef: null,
                cityRef: null,
                sections: [],
                faqs: [],
                themes: [],
                travelTypes: [],
                tags: [],
                relationsFrom: [],
              },
            },
          ],
        },
      }
    );

    assert.equal(
      result.assetId,
      "asset-1"
    );

    assert.equal(
      result.briefCreated,
      true
    );

    assert.equal(
      savedAssets[0].status,
      "review"
    );

    assert.equal(
      savedAssets[0]
        .payload
        .brief
        .subject
        .destination,
      "Île Maurice"
    );
  }
);
