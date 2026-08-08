"use strict";

import test from "node:test";
import assert from "node:assert/strict";

import {
  classifyVersionReason,
  comparePageVersions,
  normalizeVersionItem,
  normalizeVersionSnapshot,
  stableJson,
} from "../lib/page-builder-v3/index.mjs";

function page() {
  return {
    id: "page-1",
    title: "Voyage à Budapest",
    slug: "voyage-budapest",
    status: "draft",
    seoTitle: "Voyage à Budapest",
    seoDescription:
      "Préparez votre voyage à Budapest.",
    blocks: [
      {
        id: "hero",
        type: "hero",
        position: 0,
        status: "draft",
        content: {
          title:
            "Découvrez Budapest",
        },
      },
      {
        id: "cta",
        type: "cta",
        position: 1,
        status: "draft",
        content: {
          title:
            "Contactez-nous",
        },
      },
    ],
  };
}

test(
  "produit un JSON stable",
  () => {
    assert.equal(
      stableJson({
        b: 2,
        a: 1,
      }),
      stableJson({
        a: 1,
        b: 2,
      })
    );
  }
);

test(
  "normalise un snapshot",
  () => {
    const result =
      normalizeVersionSnapshot({
        snapshot: page(),
      });

    assert.equal(
      result.blocks.length,
      2
    );
  }
);

test(
  "détecte une page identique",
  () => {
    const result =
      comparePageVersions(
        page(),
        page()
      );

    assert.equal(
      result.changed,
      false
    );
  }
);

test(
  "détecte un bloc ajouté",
  () => {
    const target = page();

    target.blocks.push({
      id: "faq",
      type: "faq",
      position: 2,
      content: {},
    });

    const result =
      comparePageVersions(
        page(),
        target
      );

    assert.equal(
      result.summary.added,
      1
    );
  }
);

test(
  "normalise une version",
  () => {
    const result =
      normalizeVersionItem({
        id: "version-1",
        version: 4,
        reason:
          "Publication manuelle",
        snapshot: page(),
      });

    assert.equal(
      result.version,
      4
    );
  }
);

test(
  "classe les raisons",
  () => {
    assert.equal(
      classifyVersionReason(
        "Publication manuelle"
      ),
      "publication"
    );

    assert.equal(
      classifyVersionReason(
        "visual-builder-v3-rollback"
      ),
      "rollback"
    );
  }
);
