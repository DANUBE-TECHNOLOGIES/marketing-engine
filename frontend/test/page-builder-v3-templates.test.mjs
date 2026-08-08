"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  PageTemplateRegistry,
  applyTemplateToState,
  createEditorState,
  createTravelTemplateRegistry,
  interpolate,
  normalizeTemplate,
} from "../lib/page-builder-v3/index.mjs";

test(
  "normalise un modèle de page",
  () => {
    const template =
      normalizeTemplate({
        id: "test-page",
        label: "Page test",
        blocks: [
          {
            type: "hero",
            content: {
              title: "Test",
            },
          },
        ],
      });

    assert.equal(
      template.id,
      "test-page"
    );

    assert.equal(
      template.blocks.length,
      1
    );
  }
);

test(
  "interpole les variables imbriquées",
  () => {
    const result = interpolate(
      {
        title:
          "Voyage à {{destination}}",
        items: [
          {
            text:
              "{{agency}} vous accompagne",
          },
        ],
      },
      {
        destination:
          "Île Maurice",
        agency:
          "Mondescale",
      }
    );

    assert.equal(
      result.title,
      "Voyage à Île Maurice"
    );

    assert.equal(
      result.items[0].text,
      "Mondescale vous accompagne"
    );
  }
);

test(
  "le registre refuse les doublons",
  () => {
    const registry =
      new PageTemplateRegistry();

    registry.register({
      id: "test",
      label: "Test",
      blocks: [
        {
          type: "hero",
          content: {},
        },
      ],
    });

    assert.throws(
      () =>
        registry.register({
          id: "test",
          label: "Test 2",
          blocks: [
            {
              type: "cta",
              content: {},
            },
          ],
        }),
      {
        code:
          "DUPLICATE_PAGE_TEMPLATE",
      }
    );
  }
);

test(
  "expose huit modèles voyage",
  () => {
    const registry =
      createTravelTemplateRegistry();

    assert.equal(
      registry.list().length,
      8
    );

    assert.equal(
      registry.has(
        "destination-premium"
      ),
      true
    );

    assert.equal(
      registry.has(
        "voyage-de-noces"
      ),
      true
    );
  }
);

test(
  "instancie un modèle avec destination et agence",
  () => {
    const registry =
      createTravelTemplateRegistry();

    let sequence = 0;

    const instance =
      registry.instantiate(
        "destination-premium",
        {
          destination:
            "Seychelles",
          agency:
            "Mondescale Ozoir",
        },
        {
          createId: () =>
            `block-${++sequence}`,
        }
      );

    assert.equal(
      instance.page.title,
      "Voyage à Seychelles"
    );

    assert.ok(
      instance.page.seoTitle.includes(
        "Mondescale Ozoir"
      )
    );

    assert.equal(
      instance.blocks[0].id,
      "block-1"
    );

    assert.equal(
      instance.blocks[0]
        .content.title,
      "Découvrez Seychelles"
    );
  }
);

test(
  "remplace entièrement la page",
  () => {
    const state =
      createEditorState({
        id: "page-1",
        title:
          "Ancienne page",
        blocks: [
          {
            id: "old",
            type: "rich_text",
            content: {},
          },
        ],
      });

    const registry =
      createTravelTemplateRegistry();

    const instance =
      registry.instantiate(
        "city-break",
        {
          destination:
            "Budapest",
          agency:
            "Mondescale",
        },
        {
          createId:
            (_, index) =>
              `new-${index}`,
        }
      );

    const result =
      applyTemplateToState(
        state,
        instance,
        "replace"
      );

    assert.equal(
      result.page.title,
      "City break à Budapest"
    );

    assert.equal(
      result.page.blocks.some(
        (block) =>
          block.id === "old"
      ),
      false
    );

    assert.equal(
      result.dirty,
      true
    );
  }
);

test(
  "ajoute à la suite sans dupliquer le hero",
  () => {
    const state =
      createEditorState({
        id: "page-1",
        title: "Accueil",
        blocks: [
          {
            id: "hero-existing",
            type: "hero",
            content: {
              title:
                "Hero existant",
            },
          },
        ],
      });

    const registry =
      createTravelTemplateRegistry();

    const instance =
      registry.instantiate(
        "safari",
        {},
        {
          createId:
            (_, index) =>
              `template-${index}`,
        }
      );

    const result =
      applyTemplateToState(
        state,
        instance,
        "append"
      );

    assert.equal(
      result.page.blocks.filter(
        (block) =>
          block.type === "hero"
      ).length,
      1
    );

    assert.ok(
      result.page.blocks.length >
        1
    );
  }
);

test(
  "filtre les modèles par recherche",
  () => {
    const registry =
      createTravelTemplateRegistry();

    const results =
      registry.list({
        query: "famille",
      });

    assert.equal(
      results.length,
      1
    );

    assert.equal(
      results[0].id,
      "voyage-famille"
    );
  }
);
