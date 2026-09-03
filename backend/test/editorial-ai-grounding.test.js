"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  TravelCoreContextResolver,
  normalizeTravelContext,
} = require(
  "../src/modules/editorial-ai/context-resolver"
);

const {
  EditorialAiService,
} = require(
  "../src/modules/editorial-ai/service"
);

function payload(
  mode = "deterministic"
) {
  return {
    mode,

    page: {
      id:
        "page-1",

      title:
        "Voyage à Budapest",

      slug:
        "voyage-budapest",

      blocks: [],
    },

    context: {
      destination:
        "Budapest",

      agency:
        "Mondescale Ozoir",
    },
  };
}

test(
  "normalise les données Travel Core",
  () => {
    const result =
      normalizeTravelContext(
        {
          id:
            "destination-1",

          name:
            "Budapest",

          country: {
            name:
              "Hongrie",
          },

          climate: {
            bestMonths: [
              "Avril",
              "Mai",
            ],
          },

          themes: [
            "Culture",
            "City break",
          ],

          highlights: [
            "Parlement",
            "Bains thermaux",
          ],
        },
        "Budapest"
      );

    assert.equal(
      result.available,
      true
    );

    assert.equal(
      result.facts.country,
      "Hongrie"
    );

    assert.deepEqual(
      result.facts.bestMonths,
      [
        "Avril",
        "Mai",
      ]
    );
  }
);

test(
  "ne crée aucun fait sans source",
  () => {
    const result =
      normalizeTravelContext(
        null,
        "Destination inconnue"
      );

    assert.equal(
      result.available,
      false
    );

    assert.deepEqual(
      result.facts,
      {}
    );
  }
);

test(
  "résout une destination avec un service injectable",
  async () => {
    const resolver =
      new TravelCoreContextResolver({
        travelCore: {
          async getDestinationContext(
            destination
          ) {
            return {
              name:
                destination,

              themes: [
                "Culture",
              ],
            };
          },
        },
      });

    const result =
      await resolver.resolve(
        "Budapest"
      );

    assert.equal(
      result.available,
      true
    );

    assert.deepEqual(
      result.facts.themes,
      [
        "Culture",
      ]
    );
  }
);

test(
  "le service transmet le grounding",
  async () => {
    let receivedPayload =
      null;

    const service =
      new EditorialAiService({
        contextResolver: {
          async resolve() {
            return {
              available:
                true,

              source:
                "travel-core",

              sourceFields: [
                "country",
              ],

              facts: {
                country:
                  "Hongrie",
              },
            };
          },
        },

        deterministicProvider(
          groundedPayload
        ) {
          receivedPayload =
            groundedPayload;

          return {
            page: {},
            hero: {
              titles: [],
              subtitles: [],
              ctas: [],
            },
            faq: {
              items: [],
            },
            cta: {
              actions: [],
            },
          };
        },
      });

    const result =
      await service.generate(
        payload()
      );

    assert.equal(
      receivedPayload.context
        .travelCore.facts.country,
      "Hongrie"
    );

    assert.equal(
      result.grounding.available,
      true
    );
  }
);

test(
  "le fournisseur externe reçoit Travel Core",
  async () => {
    let receivedPayload =
      null;

    const service =
      new EditorialAiService({
        contextResolver: {
          async resolve() {
            return {
              available:
                true,

              source:
                "travel-core",

              sourceFields: [
                "bestMonths",
              ],

              facts: {
                bestMonths: [
                  "Mai",
                ],
              },
            };
          },
        },

        externalProvider:
          async (groundedPayload) => {
            receivedPayload =
              groundedPayload;

            return {};
          },
      });

    await service.generate(
      payload("auto")
    );

    assert.deepEqual(
      receivedPayload.context
        .travelCore.facts.bestMonths,
      [
        "Mai",
      ]
    );
  }
);
