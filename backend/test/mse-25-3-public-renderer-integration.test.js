"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  normalizePageBuilderPayload,
} = require(
  "../src/modules/page-builder-persistence/payload-normalizer"
);

function source(relativePath) {
  return fs.readFileSync(
    path.resolve(__dirname, "..", relativePath),
    "utf8"
  );
}

test(
  "MSE-25.3 conserve l'intention de publication du Designer V2",
  () => {
    const published =
      normalizePageBuilderPayload({
        params: {
          agencyId: "6",
          pageSlug: "home",
        },
        body: {
          page: {
            slug: "",
            title: "Accueil",
            status: "published",
          },
          blocks: [],
        },
        existingPage: {
          slug: "",
          status: "draft",
          published: false,
        },
      });

    assert.equal(published.published, true);
    assert.equal(published.status, "published");

    const draft =
      normalizePageBuilderPayload({
        params: {
          agencyId: "6",
          pageSlug: "home",
        },
        body: {
          page: {
            slug: "",
            title: "Accueil",
            status: "draft",
          },
          blocks: [],
        },
        existingPage: {
          slug: "",
          status: "published",
          published: true,
        },
      });

    assert.equal(draft.published, false);
    assert.equal(draft.status, "draft");
  }
);

test(
  "MSE-25.3 raccorde la home V2 à l'endpoint canonique home",
  () => {
    const api = source(
      "../frontend/lib/page-builder-v2/page-builder-api.js"
    );

    assert.match(
      api,
      /function\s+pageApiSlug\([\s\S]*?return\s+page\?\.slug[\s\S]*?:\s*["']home["']/
    );

    assert.match(
      api,
      /pages\/\$\{pageApiSlug\(page\)\}/
    );
  }
);

test(
  "MSE-25.3 publie le site lorsqu'une page V2 devient publique",
  () => {
    const repository = source(
      "src/modules/page-builder-persistence/repository.js"
    );

    assert.match(
      repository,
      /if\s*\(input\.page\.published\s*===\s*true\)/
    );

    assert.match(
      repository,
      /tx\.agencySite\.updateMany\([\s\S]*?status:\s*["']published["'][\s\S]*?publishedAt:/
    );
  }
);

test(
  "MSE-25.3 expose uniquement le chemin public canonique /agence",
  () => {
    const publicRead = source(
      "src/modules/public-site-read/service.js"
    );

    assert.match(
      publicRead,
      /canonicalBasePath\s*=\s*`\/agence\/\$\{site\.slug\}`/
    );

    assert.doesNotMatch(
      publicRead,
      /path:\s*[^\n]*`?\/sites\//
    );
  }
);

test(
  "MSE-25.3 reconnaît explicitement l'accueil au slug vide",
  () => {
    const publicRead = source(
      "src/modules/public-site-read/service.js"
    );

    assert.match(
      publicRead,
      /page\.slug\s*===\s*["']["']/
    );
  }
);

test(
  "MSE-25.3 résout les pages publiques à partir du contrat global backend",
  () => {
    const route = source(
      "../frontend/app/api/public-sites/[[...path]]/route.js"
    );

    assert.match(
      route,
      /\/api\/public-site-read\/sites\//
    );

    assert.match(
      route,
      /findRequestedPage\([\s\S]*?pageSlug/
    );

    assert.match(
      route,
      /PUBLIC_SITE_PAGE_NOT_FOUND/
    );
  }
);

test(
  "MSE-25.3 produit les canonical SEO sur /agence",
  () => {
    const page = source(
      "../frontend/app/agence/[siteSlug]/[[...pageSlug]]/page.js"
    );

    assert.match(
      page,
      /const\s+root\s*=\s*`\/agence\/\$\{siteSlug\}`/
    );

    assert.match(
      page,
      /alternates:\s*\{[\s\S]*?canonical/
    );

    assert.match(
      page,
      /openGraph:\s*\{[\s\S]*?url:\s*canonical/
    );
  }
);
