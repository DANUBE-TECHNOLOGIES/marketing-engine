"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  createEditorState,
  preparePageForPublication,
  returnPageToDraft,
  validatePublication,
  visibleBlocksForViewport,
} from "../lib/page-builder-v3/index.mjs";

function words(count) {
  return Array.from(
    { length: count },
    (_, index) =>
      `mot${index}`
  ).join(" ");
}

function completePage() {
  return {
    id: "page-1",
    title:
      "Voyage à Budapest depuis Ozoir",
    slug:
      "voyage-budapest-ozoir",
    status: "draft",
    seoTitle:
      "Voyage à Budapest depuis Ozoir avec Mondescale",
    seoDescription:
      "Préparez votre voyage à Budapest avec votre agence Mondescale Ozoir : conseils, hôtels, visites, budget et accompagnement personnalisé.",
    blocks: [
      {
        id: "hero",
        type: "hero",
        status: "draft",
        position: 0,
        visibleDesktop: true,
        visibleMobile: true,
        content: {
          title:
            "Découvrez Budapest",
          subtitle:
            words(40),
          imageUrl:
            "https://example.test/budapest.jpg",
          imageAlt:
            "Vue de Budapest",
        },
      },
      {
        id: "text",
        type: "rich_text",
        status: "draft",
        position: 1,
        visibleDesktop: true,
        visibleMobile: true,
        content: {
          title:
            "Préparer son voyage",
          html:
            `<p>${words(320)}</p>`,
        },
      },
      {
        id: "faq",
        type: "faq",
        status: "draft",
        position: 2,
        visibleDesktop: true,
        visibleMobile: false,
        content: {
          title:
            "Questions fréquentes",
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
        id: "cta",
        type: "cta",
        status: "draft",
        position: 3,
        visibleDesktop: true,
        visibleMobile: true,
        content: {
          title:
            "Préparons votre voyage",
          text:
            "Contactez votre agence.",
        },
      },
    ],
  };
}

test(
  "filtre les blocs visibles sur mobile",
  () => {
    const result =
      visibleBlocksForViewport(
        completePage(),
        "mobile"
      );

    assert.deepEqual(
      result.map(
        (block) => block.id
      ),
      [
        "hero",
        "text",
        "cta",
      ]
    );
  }
);

test(
  "conserve tous les blocs sur ordinateur",
  () => {
    const result =
      visibleBlocksForViewport(
        completePage(),
        "desktop"
      );

    assert.equal(
      result.length,
      4
    );
  }
);

test(
  "autorise une page complète",
  () => {
    const validation =
      validatePublication(
        completePage()
      );

    assert.equal(
      validation.allowed,
      true
    );

    assert.equal(
      validation.blockers.length,
      0
    );
  }
);

test(
  "bloque une page vide",
  () => {
    const validation =
      validatePublication({
        title: "Page vide",
        slug: "page-vide",
        seoTitle: "",
        seoDescription: "",
        blocks: [],
      });

    assert.equal(
      validation.allowed,
      false
    );

    assert.ok(
      validation.blockers.some(
        (item) =>
          item.code ===
          "PUBLICATION_BLOCK_REQUIRED"
      )
    );
  }
);

test(
  "bloque un score SEO insuffisant",
  () => {
    const validation =
      validatePublication(
        {
          title: "Page faible",
          slug: "page-faible",
          seoTitle: "",
          seoDescription: "",
          blocks: [
            {
              id: "text",
              type: "rich_text",
              position: 0,
              content: {
                html:
                  "<p>Texte court.</p>",
              },
            },
          ],
        },
        {
          minimumScore: 50,
        }
      );

    assert.equal(
      validation.allowed,
      false
    );

    assert.ok(
      validation.blockers.some(
        (item) =>
          item.code ===
          "PUBLICATION_SEO_SCORE_TOO_LOW"
      )
    );
  }
);

test(
  "prépare la page pour publication",
  () => {
    const editor =
      createEditorState(
        completePage()
      );

    const result =
      preparePageForPublication(
        editor
      );

    assert.equal(
      result.editor.page.status,
      "published"
    );

    assert.equal(
      result.editor.page.blocks.every(
        (block) =>
          block.status ===
          "published"
      ),
      true
    );

    assert.equal(
      result.editor.dirty,
      true
    );
  }
);

test(
  "refuse de préparer une page faible",
  () => {
    const editor =
      createEditorState({
        id: "page-1",
        title: "Page",
        slug: "page",
        blocks: [],
      });

    assert.throws(
      () =>
        preparePageForPublication(
          editor
        ),
      {
        code:
          "PUBLICATION_BLOCKED",
      }
    );
  }
);

test(
  "repasse une page en brouillon",
  () => {
    const editor =
      createEditorState({
        ...completePage(),
        status:
          "published",
      });

    const result =
      returnPageToDraft(
        editor
      );

    assert.equal(
      result.page.status,
      "draft"
    );

    assert.equal(
      result.dirty,
      true
    );
  }
);
