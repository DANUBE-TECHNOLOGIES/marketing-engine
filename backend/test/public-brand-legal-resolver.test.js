"use strict";

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const {
  mergeDefinedFields,
  normalizePublicAsset,
  resolveAsset,
  buildCssVariables,
  buildCssText,
  buildMetadata,
} = require(
  "../src/modules/public-brand-legal"
);

test(
  "fusionne les valeurs société et agence",
  () => {
    const result =
      mergeDefinedFields({
        shared: {
          primaryColor:
            "#111111",

          headingFont:
            "Montserrat",

          bodyFont:
            "Inter",
        },

        override: {
          primaryColor:
            "#222222",

          headingFont:
            null,
        },

        fields: [
          "primaryColor",
          "headingFont",
          "bodyFont",
        ],
      });

    assert.deepEqual(
      result,
      {
        primaryColor:
          "#222222",

        headingFont:
          "Montserrat",

        bodyFont:
          "Inter",
      }
    );
  }
);

test(
  "normalise un média public",
  () => {
    assert.deepEqual(
      normalizePublicAsset({
        id:
          "asset-1",

        kind:
          "logo-primary",

        publicUrl:
          "/media/logo.png",

        mimeType:
          "image/png",

        width:
          100,

        height:
          50,

        altText:
          "Logo",

        title:
          null,

        description:
          null,

        originalName:
          "logo.png",

        storageKey:
          "secret/path/logo.png",
      }),
      {
        id:
          "asset-1",

        kind:
          "logo-primary",

        publicUrl:
          "/media/logo.png",

        mimeType:
          "image/png",

        width:
          100,

        height:
          50,

        altText:
          "Logo",

        title:
          null,

        description:
          null,

        originalName:
          "logo.png",
      }
    );
  }
);

test(
  "préfère le média de l’agence",
  () => {
    const shared = {
      logoPrimaryId:
        "shared",

      logoPrimary: {
        id:
          "shared",

        kind:
          "logo-primary",

        publicUrl:
          "/shared.png",
      },
    };

    const override = {
      logoPrimaryId:
        "agency",

      logoPrimary: {
        id:
          "agency",

        kind:
          "logo-primary",

        publicUrl:
          "/agency.png",
      },
    };

    assert.equal(
      resolveAsset({
        shared,
        override,

        relation:
          "logoPrimary",
      }).id,
      "agency"
    );
  }
);

test(
  "hérite du média société sans surcharge",
  () => {
    const shared = {
      faviconId:
        "shared-favicon",

      favicon: {
        id:
          "shared-favicon",

        kind:
          "favicon",

        publicUrl:
          "/favicon.png",
      },
    };

    assert.equal(
      resolveAsset({
        shared,
        override:
          null,

        relation:
          "favicon",
      }).id,
      "shared-favicon"
    );
  }
);

test(
  "construit les variables CSS",
  () => {
    assert.deepEqual(
      buildCssVariables({
        primaryColor:
          "#123456",

        secondaryColor:
          "#FFFFFF",

        headingFont:
          "Montserrat",

        buttonRadius:
          8,
      }),
      {
        "--brand-primary":
          "#123456",

        "--brand-secondary":
          "#FFFFFF",

        "--brand-heading-font":
          "Montserrat",

        "--brand-button-radius":
          "8px",
      }
    );
  }
);

test(
  "construit le texte CSS",
  () => {
    const css =
      buildCssText({
        "--brand-primary":
          "#123456",

        "--brand-text":
          "#111111",
      });

    assert.match(
      css,
      /--brand-primary: #123456;/
    );

    assert.match(
      css,
      /--brand-text: #111111;/
    );
  }
);

test(
  "construit les métadonnées avec favicon et OpenGraph",
  () => {
    const metadata =
      buildMetadata({
        brand: {
          defaultSeoTitle:
            "Mondescale",

          defaultSeoDescription:
            "Voyages sur mesure",
        },

        assets: {
          favicon: {
            publicUrl:
              "/favicon.png",
          },

          openGraph: {
            publicUrl:
              "/og.jpg",

            width:
              1200,

            height:
              630,

            altText:
              "Mondescale",
          },
        },

        agency: {
          name:
            "Agence test",
        },
      });

    assert.equal(
      metadata.title,
      "Mondescale"
    );

    assert.equal(
      metadata.icons.icon,
      "/favicon.png"
    );

    assert.equal(
      metadata
        .openGraph
        .images[0]
        .url,
      "/og.jpg"
    );
  }
);
