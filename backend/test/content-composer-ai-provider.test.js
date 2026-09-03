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
  AiContentProvider,
  DeterministicContentProvider,
  ResilientContentProvider,
  validateGeneratedContent,
  buildContentComposerPrompt,
} =
  require(
    "../src/modules/content-composer"
  );

test(
  "valide une sortie structurée",
  () => {
    const result =
      validateGeneratedContent({
        sections: [
          {
            sectionType:
              "hero",

            content: {
              title:
                "Bonjour",
            },
          },
        ],

        seo: {
          title:
            "Titre SEO",
        },
      });

    assert.equal(
      result.sections.length,
      1
    );
  }
);

test(
  "refuse une sortie sans sections",
  () => {
    assert.throws(
      () =>
        validateGeneratedContent({
          seo: {},
        })
    );
  }
);

test(
  "provider IA parse une réponse JSON",
  async () => {
    const provider =
      new AiContentProvider({
        client: {
          async generate() {
            return JSON.stringify({
              sections: [
                {
                  sectionType:
                    "hero",

                  content: {
                    title:
                      "IA",
                  },
                },
              ],

              seo: {},
            });
          },
        },

        model:
          "test-model",

        name:
          "test-ai",
      });

    const result =
      await provider.generate({
        template: {
          pageType:
            "HOME",

          sections:
            [],
        },

        context: {
          agency: {},
        },

        instructions:
          "",
      });

    assert.equal(
      result.provider,
      "test-ai"
    );

    assert.equal(
      result.sections[0]
        .content.title,
      "IA"
    );
  }
);

test(
  "fallback utilisé si provider IA échoue",
  async () => {
    const primary = {
      async generate() {
        throw new Error(
          "provider down"
        );
      },
    };

    const fallback =
      new DeterministicContentProvider();

    const provider =
      new ResilientContentProvider({
        primary,
        fallback,
      });

    const result =
      await provider.generate({
        template: {
          sections: [],
          seo: {},
        },

        context: {
          agency: {},
          seo: {},
        },

        instructions:
          "",
      });

    assert.equal(
      result.fallbackUsed,
      true
    );

    assert.equal(
      result.provider,
      "deterministic"
    );
  }
);

test(
  "prompt interdit invention des coordonnées et prix",
  () => {
    const prompt =
      buildContentComposerPrompt({
        pageType:
          "HOME",

        template: {
          id:
            "home",

          sections:
            [],
        },

        context: {
          agency: {
            name:
              "Test",
          },
        },

        instructions:
          "",
      });

    assert.match(
      prompt,
      /ne jamais inventer une adresse/i
    );

    assert.match(
      prompt,
      /ne jamais inventer de prix/i
    );
  }
);
