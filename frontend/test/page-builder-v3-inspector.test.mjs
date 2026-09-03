"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  addArrayItem,
  inspectorDefinition,
  moveArrayItem,
  normalizeInspectorUrl,
  removeArrayItem,
  setNestedValue,
  updateArrayItem,
  updateBlockField,
} from "../lib/page-builder-v3/index.mjs";

const faqBlock = {
  id: "faq-1",
  type: "faq",
  content: {
    title:
      "Questions fréquentes",
    items: [
      {
        question:
          "Première question",
        answer:
          "Première réponse",
      },
      {
        question:
          "Deuxième question",
        answer:
          "Deuxième réponse",
      },
    ],
  },
};

test(
  "met à jour une valeur imbriquée",
  () => {
    const result =
      setNestedValue(
        {
          primaryCta: {
            label: "Ancien",
          },
        },
        "primaryCta.label",
        "Nouveau"
      );

    assert.equal(
      result.primaryCta.label,
      "Nouveau"
    );
  }
);

test(
  "met à jour le contenu d’un bloc",
  () => {
    const result =
      updateBlockField(
        {
          id: "hero-1",
          content: {
            title: "Ancien",
          },
        },
        "title",
        "Nouveau"
      );

    assert.equal(
      result.content.title,
      "Nouveau"
    );
  }
);

test(
  "ajoute un élément de FAQ",
  () => {
    const result =
      addArrayItem(
        faqBlock,
        "items",
        {
          question:
            "Troisième question",
          answer:
            "Troisième réponse",
        }
      );

    assert.equal(
      result.content.items.length,
      3
    );
  }
);

test(
  "met à jour un élément de FAQ",
  () => {
    const result =
      updateArrayItem(
        faqBlock,
        "items",
        0,
        {
          answer:
            "Réponse modifiée",
        }
      );

    assert.equal(
      result.content.items[0].answer,
      "Réponse modifiée"
    );
  }
);

test(
  "supprime un élément de FAQ",
  () => {
    const result =
      removeArrayItem(
        faqBlock,
        "items",
        0
      );

    assert.equal(
      result.content.items.length,
      1
    );

    assert.equal(
      result.content.items[0].question,
      "Deuxième question"
    );
  }
);

test(
  "déplace un élément de FAQ",
  () => {
    const result =
      moveArrayItem(
        faqBlock,
        "items",
        1,
        -1
      );

    assert.equal(
      result.content.items[0].question,
      "Deuxième question"
    );
  }
);

test(
  "accepte une URL HTTPS",
  () => {
    assert.equal(
      normalizeInspectorUrl(
        "https://example.test/image.jpg"
      ),
      "https://example.test/image.jpg"
    );
  }
);

test(
  "accepte une ancre",
  () => {
    assert.equal(
      normalizeInspectorUrl(
        "#contact"
      ),
      "#contact"
    );
  }
);

test(
  "refuse JavaScript dans une URL",
  () => {
    assert.throws(
      () =>
        normalizeInspectorUrl(
          "javascript:alert(1)"
        ),
      {
        code:
          "UNSAFE_INSPECTOR_URL",
      }
    );
  }
);

test(
  "retourne la définition du Hero",
  () => {
    const definition =
      inspectorDefinition(
        "hero"
      );

    assert.equal(
      definition.title,
      "Bannière principale"
    );

    assert.ok(
      definition.sections.includes(
        "actions"
      )
    );
  }
);
