"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  applyEditorialPatchToEditor,
  buildEditorialSuggestions,
  createEditorialPatch,
  createEditorState,
  inferDestination,
  truncateEditorialText,
} from "../lib/page-builder-v3/index.mjs";

function page() {
  return {
    id: "page-1",
    title:
      "Voyage à Budapest",
    slug:
      "voyage-budapest",
    status: "draft",
    seoTitle: "",
    seoDescription: "",
    blocks: [
      {
        id: "hero",
        type: "hero",
        position: 0,
        content: {
          title:
            "Voyage à Budapest",
          subtitle: "",
          primaryCta: {
            label:
              "Nous contacter",
            href: "#contact",
          },
        },
      },
      {
        id: "faq",
        type: "faq",
        position: 1,
        content: {
          title: "FAQ",
          items: [],
        },
      },
      {
        id: "cta",
        type: "cta",
        position: 2,
        content: {
          title:
            "Contactez-nous",
          text: "",
        },
      },
    ],
  };
}

test(
  "détecte la destination depuis le Hero",
  () => {
    assert.equal(
      inferDestination(
        page()
      ),
      "Budapest"
    );
  }
);

test(
  "respecte la longueur maximale",
  () => {
    const value =
      truncateEditorialText(
        "Une très longue phrase destinée à tester correctement la troncature.",
        30
      );

    assert.ok(
      value.length <= 30
    );
  }
);

test(
  "génère les suggestions éditoriales",
  () => {
    const result =
      buildEditorialSuggestions(
        page(),
        {
          agency:
            "Mondescale Ozoir",
        }
      );

    assert.equal(
      result.destination,
      "Budapest"
    );

    assert.equal(
      result.hero.titles.length,
      3
    );

    assert.equal(
      result.faq.items.length,
      4
    );

    assert.ok(
      result.page.seoTitle.length <=
        60
    );

    assert.ok(
      result.page
        .seoDescription.length <=
        160
    );
  }
);

test(
  "applique les réglages SEO",
  () => {
    const suggestions =
      buildEditorialSuggestions(
        page()
      );

    const result =
      createEditorialPatch(
        page(),
        suggestions,
        {
          pageSettings: true,
        }
      );

    assert.equal(
      result.slug,
      "voyage-budapest"
    );

    assert.ok(
      result.seoTitle
    );
  }
);

test(
  "applique une proposition Hero",
  () => {
    const suggestions =
      buildEditorialSuggestions(
        page()
      );

    const result =
      createEditorialPatch(
        page(),
        suggestions,
        {
          heroTitleIndex: 1,
          heroSubtitleIndex: 2,
          heroCtaIndex: 0,
        }
      );

    const hero =
      result.blocks.find(
        (block) =>
          block.type === "hero"
      );

    assert.equal(
      hero.content.title,
      suggestions.hero.titles[1]
    );

    assert.equal(
      hero.content.subtitle,
      suggestions.hero
        .subtitles[2]
    );
  }
);

test(
  "remplace la FAQ",
  () => {
    const suggestions =
      buildEditorialSuggestions(
        page()
      );

    const result =
      createEditorialPatch(
        page(),
        suggestions,
        {
          faq: true,
        }
      );

    const faq =
      result.blocks.find(
        (block) =>
          block.type === "faq"
      );

    assert.equal(
      faq.content.items.length,
      4
    );
  }
);

test(
  "applique le patch dans l’éditeur",
  () => {
    const editor =
      createEditorState(
        page()
      );

    const suggestions =
      buildEditorialSuggestions(
        page()
      );

    const result =
      applyEditorialPatchToEditor(
        editor,
        suggestions,
        {
          pageSettings: true,
          heroTitleIndex: 0,
          faq: true,
          cta: true,
        }
      );

    assert.equal(
      result.dirty,
      true
    );

    assert.equal(
      result.revision,
      editor.revision + 1
    );
  }
);
