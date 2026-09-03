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
  DeterministicContentProvider,
  buildComposerContext,
} =
  require(
    "../src/modules/content-composer"
  );

test(
  "le contexte contient les données agence",
  () => {
    const context =
      buildComposerContext({
        agency: {
          id:
            6,

          name:
            "Agence Test",

          city:
            "Paris",
        },

        site:
          null,

        brandProfile:
          null,

        seo: {
          primaryKeyword:
            "agence de voyages Paris",
        },

        template: {
          id:
            "home",
        },
      });

    assert.equal(
      context.agency.id,
      6
    );

    assert.equal(
      context.agency.city,
      "Paris"
    );

    assert.equal(
      context.seo.primaryKeyword,
      "agence de voyages Paris"
    );
  }
);

test(
  "le provider déterministe remplace les variables",
  async () => {
    const provider =
      new DeterministicContentProvider();

    const result =
      await provider.generate({
        template: {
          sections: [
            {
              sectionType:
                "hero",

              content: {
                title:
                  "Votre agence à {{agency.city}}",

                subtitle:
                  "{{agency.name}}",
              },
            },
          ],
        },

        context: {
          agency: {
            name:
              "Mondescale",

            city:
              "Lamorlaye",

            phone:
              null,

            email:
              null,
          },

          seo: {
            primaryKeyword:
              "",

            targetLocation:
              "Lamorlaye",
          },
        },

        instructions:
          "",
      });

    assert.equal(
      result.sections[0]
        .content.title,
      "Votre agence à Lamorlaye"
    );

    assert.equal(
      result.sections[0]
        .content.subtitle,
      "Mondescale"
    );
  }
);
