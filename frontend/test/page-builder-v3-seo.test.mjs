"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  auditPageSeo,
  calculatePageWordCount,
  createEditorState,
  normalizeSlug,
  pageHasBlock,
  textFromHtml,
  updatePageSettings,
} from "../lib/page-builder-v3/index.mjs";

test(
  "normalise un slug français",
  () => {
    assert.equal(
      normalizeSlug(
        " Voyage à l’Île Maurice ! "
      ),
      "voyage-a-l-ile-maurice"
    );
  }
);

test(
  "retire le HTML du contenu",
  () => {
    assert.equal(
      textFromHtml(
        "<p>Voyage <strong>à Budapest</strong></p>"
      ),
      "Voyage à Budapest"
    );
  }
);

test(
  "calcule le nombre de mots",
  () => {
    const page = {
      blocks: [
        {
          type: "hero",
          content: {
            title:
              "Voyage à Budapest",
            subtitle:
              "Découvrez une ville exceptionnelle.",
          },
        },
        {
          type: "rich_text",
          content: {
            html:
              "<p>Un séjour culturel et gastronomique.</p>",
          },
        },
      ],
    };

    assert.equal(
      calculatePageWordCount(page),
      12
    );
  }
);

test(
  "détecte un type de bloc",
  () => {
    const page = {
      blocks: [
        {
          type: "hero",
        },
        {
          type: "cta",
        },
      ],
    };

    assert.equal(
      pageHasBlock(page, "hero"),
      true
    );

    assert.equal(
      pageHasBlock(page, "faq"),
      false
    );
  }
);

test(
  "audite une page incomplète",
  () => {
    const audit =
      auditPageSeo({
        title: "Budapest",
        slug: "Budapest !",
        seoTitle: "",
        seoDescription: "",
        blocks: [],
      });

    assert.ok(
      audit.score < 50
    );

    assert.equal(
      audit.grade,
      "E"
    );

    assert.ok(
      audit.recommendations.length >
        0
    );
  }
);

test(
  "audite une page SEO complète",
  () => {
    const words = Array.from(
      { length: 320 },
      (_, index) =>
        `mot${index}`
    ).join(" ");

    const audit =
      auditPageSeo({
        title:
          "Voyage à Budapest depuis Ozoir",
        slug:
          "voyage-budapest-ozoir",
        seoTitle:
          "Voyage à Budapest depuis Ozoir avec Mondescale",
        seoDescription:
          "Préparez votre voyage à Budapest avec votre agence Mondescale Ozoir : conseils, hôtels, visites, budget et accompagnement personnalisé.",
        blocks: [
          {
            type: "hero",
            content: {
              title:
                "Découvrez Budapest",
              imageUrl:
                "https://example.test/budapest.jpg",
              imageAlt:
                "Vue de Budapest et du Danube",
            },
          },
          {
            type: "rich_text",
            content: {
              html:
                `<p>${words}</p>`,
            },
          },
          {
            type: "faq",
            content: {
              items: [
                {
                  question:
                    "Quand partir ?",
                  answer:
                    "Au printemps.",
                },
              ],
            },
          },
          {
            type: "cta",
            content: {
              title:
                "Préparons votre voyage",
            },
          },
        ],
      });

    assert.equal(
      audit.score,
      100
    );

    assert.equal(
      audit.grade,
      "A"
    );

    assert.equal(
      audit.failed,
      0
    );
  }
);

test(
  "met à jour les réglages de page",
  () => {
    const editor =
      createEditorState({
        id: "page-1",
        title: "Ancien titre",
        slug: "ancien",
        status: "draft",
        blocks: [],
      });

    const updated =
      updatePageSettings(
        editor,
        {
          title:
            "Voyage à l’Île Maurice",
          slug:
            "Voyage Île Maurice",
          status:
            "review",
          seoTitle:
            "Voyage à l’Île Maurice sur mesure",
          seoDescription:
            "Préparez votre voyage à l’Île Maurice avec votre agence de voyages.",
        }
      );

    assert.equal(
      updated.page.slug,
      "voyage-ile-maurice"
    );

    assert.equal(
      updated.page.status,
      "review"
    );

    assert.equal(
      updated.dirty,
      true
    );
  }
);

test(
  "refuse un statut inconnu",
  () => {
    const editor =
      createEditorState({
        id: "page-1",
        title: "Page",
        blocks: [],
      });

    assert.throws(
      () =>
        updatePageSettings(
          editor,
          {
            status: "online",
          }
        ),
      {
        code:
          "INVALID_PAGE_STATUS",
      }
    );
  }
);
