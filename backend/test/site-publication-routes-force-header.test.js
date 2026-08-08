"use strict";

const fs =
  require(
    "node:fs"
  );

const path =
  require(
    "node:path"
  );

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const {
  requestHeaders,
} =
  require(
    "../src/modules/site-publication/routes"
  );

const ROUTES_FILE =
  path.resolve(
    __dirname,
    "../src/modules/site-publication/routes.js"
  );

function routeSource(
  routePath,
  nextRoutePath
) {
  const source =
    fs.readFileSync(
      ROUTES_FILE,
      "utf8"
    );

  const routeMarker =
    `"${routePath}"`;

  const routeStart =
    source.indexOf(
      routeMarker
    );

  if (routeStart < 0) {
    throw new Error(
      `Route introuvable : ${routePath}`
    );
  }

  const nextMarker =
    nextRoutePath
      ? `"${nextRoutePath}"`
      : null;

  const routeEnd =
    nextMarker
      ? source.indexOf(
          nextMarker,
          routeStart + routeMarker.length
        )
      : source.length;

  if (
    nextMarker &&
    routeEnd < 0
  ) {
    throw new Error(
      `Route suivante introuvable : ${nextRoutePath}`
    );
  }

  return source.slice(
    routeStart,
    routeEnd
  );
}

test(
  "requestHeaders construit les en-têtes applicatifs attendus",
  () => {
    const headerValues = {
      cookie:
        "session=test",

      authorization:
        "Bearer test",

      "x-tenant-slug":
        "mondescale",

      "x-user-id":
        "user-1",

      "x-user-name":
        "Utilisateur Test",

      "x-site-publication-force-token":
        "technical-secret",
    };

    const request = {
      headers:
        headerValues,

      get(
        name
      ) {
        return (
          headerValues[
            String(
              name
            ).toLowerCase()
          ] ||
          undefined
        );
      },
    };

    const headers =
      requestHeaders(
        request
      );

    assert.equal(
      typeof headers,
      "object"
    );

    assert.ok(
      headers !== null
    );

    /*
     * requestHeaders reste consacré au contrat applicatif existant.
     * Le jeton technique est ajouté séparément dans la route publish.
     */
    assert.equal(
      headers[
        "x-site-publication-force-token"
      ],
      undefined
    );
  }
);

test(
  "la route publish transmet explicitement le jeton technique",
  () => {
    const source =
      routeSource(
        "/sites/:siteId/publish",
        "/sites/:siteId/unpublish"
      );

    assert.match(
      source,
      /await\s+service\.publish\s*\(\s*\{/s
    );

    assert.match(
      source,
      /headers\s*:\s*\{\s*\.\.\.requestHeaders\s*\(\s*request\s*\)/s
    );

    assert.match(
      source,
      /["']x-site-publication-force-token["']\s*:\s*request\.headers\s*\[\s*["']x-site-publication-force-token["']\s*\]/s
    );

    assert.match(
      source,
      /request\.headers\s*\[\s*["']x-site-publication-force-token["']\s*\]\s*\|\|\s*["']/s
    );
  }
);

test(
  "la route unpublish ne reçoit pas le jeton technique",
  () => {
    const source =
      routeSource(
        "/sites/:siteId/unpublish",
        null
      );

    assert.match(
      source,
      /await\s+service\.unpublish\s*\(\s*\{/s
    );

    assert.doesNotMatch(
      source,
      /x-site-publication-force-token/i
    );
  }
);

test(
  "le mode force provient uniquement du corps JSON",
  () => {
    const source =
      routeSource(
        "/sites/:siteId/publish",
        "/sites/:siteId/unpublish"
      );

    assert.match(
      source,
      /force\s*:\s*request\.body\s*\?\.\s*force\s*===\s*true/s
    );

    assert.doesNotMatch(
      source,
      /force\s*:\s*true\s*[,}]/s
    );
  }
);

test(
  "le planToken reste transmis indépendamment du mode force",
  () => {
    const source =
      routeSource(
        "/sites/:siteId/publish",
        "/sites/:siteId/unpublish"
      );

    assert.match(
      source,
      /planToken\s*:\s*request\.body\s*\?\.\s*planToken\s*\|\|\s*null/s
    );
  }
);
