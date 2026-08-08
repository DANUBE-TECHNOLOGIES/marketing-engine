import test from "node:test";
import assert from "node:assert/strict";

import {
  MEDIA_KINDS,
  normalizeAgencyId,
  normalizeAsset,
} from "../lib/brand-studio/media-api.js";

test(
  "expose les six rôles médias",
  () => {
    assert.equal(
      MEDIA_KINDS.length,
      6
    );

    assert.deepEqual(
      MEDIA_KINDS.map(
        (item) =>
          item.profileField
      ),
      [
        "logoPrimaryId",
        "logoLightId",
        "logoDarkId",
        "faviconId",
        "heroDefaultId",
        "openGraphId",
      ]
    );
  }
);

test(
  "valide un identifiant agence",
  () => {
    assert.equal(
      normalizeAgencyId("6"),
      6
    );

    assert.throws(
      () =>
        normalizeAgencyId(
          "agence"
        )
    );
  }
);

test(
  "normalise un média",
  () => {
    assert.deepEqual(
      normalizeAsset({
        id:
          "asset-1",

        kind:
          "logo-primary",

        url:
          "/media/logo.png",

        alt:
          "Logo",

        filename:
          "logo.png",
      }),
      {
        id:
          "asset-1",

        kind:
          "logo-primary",

        publicUrl:
          "/media/logo.png",

        altText:
          "Logo",

        title:
          "",

        originalName:
          "logo.png",

        mimeType:
          "",

        width:
          null,

        height:
          null,
      }
    );
  }
);
