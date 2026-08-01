"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  composeDeterministicContent,
  buildLandingPage,
  buildFaq,
  buildHeroImageBrief,
} = require("../src/modules/content-generation");

function brief(channel = "landing-page") {
  return {
    channel,

    subject: {
      destination: "Île Maurice",
      slug: "ile-maurice",
      country: "Maurice",
    },

    publisher: {
      agencyName:
        "Mondescale Bois-Colombes",
      city: "Bois-Colombes",
    },

    facts: {
      tagline:
        "Lagons et douceur de vivre",
      summary:
        "Une destination de l'océan Indien.",
      practical: {
        bestTime: "Mai à décembre",
        idealDuration: "8 à 12 jours",
        currency: "MUR",
        language: "français",
      },
      highlights: [
        "lagons",
        "plages",
        "gastronomie",
      ],
      audiences: [
        "couples",
        "familles",
      ],
      faqs: [],
    },

    seo: {
      title:
        "Voyage à l'Île Maurice",
      description:
        "Découvrez l'Île Maurice.",
      canonicalSlug:
        "ile-maurice",
    },
  };
}

test(
  "buildLandingPage génère une structure SEO",
  () => {
    const content =
      buildLandingPage(
        brief("landing-page")
      );

    assert.equal(
      content.format,
      "landing-page"
    );

    assert.equal(
      content.slug,
      "ile-maurice"
    );

    assert.ok(
      content.sections.length >= 5
    );
  }
);

test(
  "buildFaq utilise les données pratiques",
  () => {
    const content =
      buildFaq(brief("faq"));

    assert.ok(
      content.questions.some(
        (item) =>
          item.question.includes(
            "Quand partir"
          )
      )
    );
  }
);

test(
  "composeDeterministicContent génère une newsletter",
  () => {
    const content =
      composeDeterministicContent(
        brief("newsletter")
      );

    assert.equal(
      content.format,
      "newsletter"
    );

    assert.ok(content.subject);
    assert.ok(content.cta);
  }
);

test(
  "buildHeroImageBrief interdit le texte dans l'image",
  () => {
    const content =
      buildHeroImageBrief(
        brief("hero-image")
      );

    assert.equal(
      content.recommendedRatio,
      "16:9"
    );

    assert.match(
      content.prompt,
      /aucun texte intégré/i
    );
  }
);

test(
  "composeDeterministicContent refuse un canal inconnu",
  () => {
    assert.throws(
      () =>
        composeDeterministicContent(
          brief("unknown")
        ),
      {
        code:
          "DETERMINISTIC_COMPOSER_UNSUPPORTED",
      }
    );
  }
);
