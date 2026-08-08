"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  applySavedPage,
  createDraftPayload,
  createEditorState,
  serializeEditorPage,
} from "../lib/page-builder-v3/index.mjs";

test(
  "sérialise une page V3 pour l’API",
  () => {
    const editor =
      createEditorState({
        id: "page-1",
        title:
          "Voyage à Budapest",
        slug: "budapest",
        status: "review",
        seoTitle:
          "Voyage à Budapest",
        seoDescription:
          "Découvrez Budapest.",
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            status: "published",
            position: 8,
            content: {
              title: "Budapest",
            },
            settings: {
              alignment: "left",
            },
          },
          {
            id: "cta-1",
            type: "cta",
            status: "draft",
            position: 2,
            content: {
              title:
                "Préparons votre voyage",
            },
          },
        ],
      });

    const serialized =
      serializeEditorPage(editor);

    assert.equal(
      serialized.id,
      "page-1"
    );

    assert.equal(
      serialized.status,
      "review"
    );

    assert.equal(
      serialized.blocks.length,
      2
    );

    assert.deepEqual(
      serialized.blocks.map(
        (block) => block.position
      ),
      [0, 1]
    );

    assert.equal(
      serialized.blocks[0]
        .content.title,
      "Budapest"
    );
  }
);

test(
  "normalise un statut inconnu",
  () => {
    const editor =
      createEditorState({
        id: "page-1",
        title: "Page",
        status: "inconnu",
        blocks: [],
      });

    const serialized =
      serializeEditorPage(editor);

    assert.equal(
      serialized.status,
      "draft"
    );
  }
);

test(
  "applique la réponse serveur",
  () => {
    const editor =
      createEditorState({
        id: "page-1",
        title: "Ancien titre",
        slug: "ancien",
        blocks: [
          {
            id: "local-1",
            type: "hero",
            content: {
              title:
                "Hero local",
            },
          },
        ],
      });

    const dirtyEditor = {
      ...editor,
      dirty: true,
    };

    const result =
      applySavedPage(
        dirtyEditor,
        {
          id: "page-1",
          title:
            "Nouveau titre",
          slug: "nouveau",
          status: "published",
          seoTitle:
            "Titre SEO",
          seoDescription:
            "Description SEO",
          blocks: [
            {
              id: "server-1",
              type: "hero",
              status: "published",
              position: 0,
              content: {
                title:
                  "Hero serveur",
              },
              settings: {},
            },
          ],
        }
      );

    assert.equal(
      result.page.title,
      "Nouveau titre"
    );

    assert.equal(
      result.page.slug,
      "nouveau"
    );

    assert.equal(
      result.page.blocks[0].id,
      "server-1"
    );

    assert.equal(
      result.dirty,
      false
    );
  }
);

test(
  "crée un brouillon local versionné",
  () => {
    const editor =
      createEditorState({
        id: "page-1",
        title: "Accueil",
        blocks: [],
      });

    const payload =
      createDraftPayload(
        "site-1",
        editor
      );

    assert.equal(
      payload.version,
      1
    );

    assert.equal(
      payload.siteId,
      "site-1"
    );

    assert.equal(
      payload.pageId,
      "page-1"
    );

    assert.ok(
      payload.savedAt
    );
  }
);
