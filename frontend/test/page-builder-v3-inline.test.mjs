"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  escapeHtml,
  htmlToInlineText,
  inlineFieldDefinition,
  normalizeInlineText,
  textToParagraphHtml,
  updateBlockContentField,
} from "../lib/page-builder-v3/index.mjs";

test(
  "normalise un titre sur une ligne",
  () => {
    assert.equal(
      normalizeInlineText(
        "  Voyage   à   Budapest  "
      ),
      "Voyage à Budapest"
    );
  }
);

test(
  "conserve les paragraphes",
  () => {
    assert.equal(
      normalizeInlineText(
        "Premier paragraphe\n\n\nSecond paragraphe",
        {
          multiline: true,
        }
      ),
      "Premier paragraphe\n\nSecond paragraphe"
    );
  }
);

test(
  "respecte la longueur maximale",
  () => {
    assert.equal(
      normalizeInlineText(
        "abcdefgh",
        {
          maxLength: 5,
        }
      ),
      "abcde"
    );
  }
);

test(
  "échappe le HTML",
  () => {
    assert.equal(
      escapeHtml(
        '<script>alert("x")</script>'
      ),
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
  }
);

test(
  "transforme le texte en paragraphes HTML",
  () => {
    assert.equal(
      textToParagraphHtml(
        "Premier\n\nSecond"
      ),
      "<p>Premier</p><p>Second</p>"
    );
  }
);

test(
  "transforme le HTML en texte éditable",
  () => {
    assert.equal(
      htmlToInlineText(
        "<p>Premier<br>ligne</p><p>Second</p>"
      ),
      "Premier\nligne\n\nSecond"
    );
  }
);

test(
  "met à jour le titre d’un bloc",
  () => {
    const result =
      updateBlockContentField(
        {
          id: "hero-1",
          type: "hero",
          content: {
            title:
              "Ancien titre",
          },
        },
        "title",
        " Nouveau titre "
      );

    assert.equal(
      result.content.title,
      "Nouveau titre"
    );
  }
);

test(
  "met à jour un contenu HTML",
  () => {
    const result =
      updateBlockContentField(
        {
          id: "text-1",
          type: "rich_text",
          content: {
            html:
              "<p>Ancien</p>",
          },
        },
        "html",
        "Premier\n\nSecond",
        {
          html: true,
          multiline: true,
        }
      );

    assert.equal(
      result.content.html,
      "<p>Premier</p><p>Second</p>"
    );
  }
);

test(
  "expose les limites du Hero",
  () => {
    const definition =
      inlineFieldDefinition(
        "hero",
        "title"
      );

    assert.equal(
      definition.multiline,
      false
    );

    assert.equal(
      definition.maxLength,
      120
    );
  }
);

test(
  "refuse un champ invalide",
  () => {
    assert.throws(
      () =>
        updateBlockContentField(
          {
            id: "hero-1",
            content: {},
          },
          "__proto__.test",
          "valeur"
        ),
      {
        code:
          "INVALID_INLINE_FIELD",
      }
    );
  }
);
