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
  factualSafetyCheck,
  scoreSeo,
  jaccardSimilarity,
  evaluateGeneratedContent,
} =
  require(
    "../src/modules/content-composer"
  );

test(
  "refuse un téléphone inventé",
  () => {
    const result =
      factualSafetyCheck({
        content: {
          sections: [
            {
              content: {
                text:
                  "Appelez-nous au 01 23 45 67 89",
              },
            },
          ],
        },

        context: {
          agency: {
            phone:
              "09 73 03 72 20",

            email:
              null,
          },
        },
      });

    assert.equal(
      result.safe,
      false
    );

    assert.ok(
      result.issues.some(
        issue =>
          issue.code ===
          "UNVERIFIED_PHONE"
      )
    );
  }
);

test(
  "refuse un prix non sourcé",
  () => {
    const result =
      factualSafetyCheck({
        content: {
          sections: [
            {
              content: {
                title:
                  "Séjour à partir de 999 €",
              },
            },
          ],
        },

        context: {
          agency: {},
        },
      });

    assert.equal(
      result.safe,
      false
    );

    assert.ok(
      result.issues.some(
        issue =>
          issue.code ===
          "UNSOURCED_PRICE"
      )
    );
  }
);

test(
  "mesure similarité",
  () => {
    const score =
      jaccardSimilarity(
        "agence voyage conseil personnalisé paris",
        "agence voyage conseil personnalisé paris"
      );

    assert.equal(
      score,
      1
    );
  }
);

test(
  "SEO favorise keyword et ville",
  () => {
    const result =
      scoreSeo({
        content: {
          sections: [
            {
              sectionType:
                "hero",

              content: {
                title:
                  "Agence de voyages à Lamorlaye",
              },
            },

            {
              sectionType:
                "intro",

              content: {
                text:
                  "Notre agence de voyages à Lamorlaye vous accompagne pour vos projets de voyages sur mesure. ".repeat(
                    15
                  ),
              },
            },
          ],

          seo: {
            title:
              "Agence de voyages à Lamorlaye | Mondescale",

            description:
              "Découvrez votre agence de voyages à Lamorlaye et profitez de conseils personnalisés pour organiser séjours, circuits et voyages sur mesure avec nos conseillers.",
          },
        },

        context: {
          agency: {
            city:
              "Lamorlaye",
          },

          seo: {
            primaryKeyword:
              "agence de voyages",

            targetLocation:
              "Lamorlaye",
          },
        },
      });

    assert.ok(
      result.score >=
      70
    );
  }
);

test(
  "quality guard rejette une erreur factuelle bloquante",
  () => {
    const result =
      evaluateGeneratedContent({
        template: {
          sections: [
            {
              sectionType:
                "hero",
            },
          ],
        },

        content: {
          sections: [
            {
              sectionType:
                "hero",

              content: {
                text:
                  "Appelez le 01 23 45 67 89 pour une offre à 999 €.",
              },
            },
          ],

          seo: {},
        },

        context: {
          agency: {
            phone:
              "09 73 03 72 20",
          },

          seo: {},
        },
      });

    assert.equal(
      result.accepted,
      false
    );

    assert.ok(
      result.blockingIssues.length >=
      1
    );
  }
);
