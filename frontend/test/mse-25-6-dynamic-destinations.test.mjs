import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routeSource = fs.readFileSync(
  new URL(
    "../app/api/website-builder/destinations/route.js",
    import.meta.url
  ),
  "utf8"
);

const apiSource = fs.readFileSync(
  new URL(
    "../lib/page-builder-v2/page-builder-api.js",
    import.meta.url
  ),
  "utf8"
);

const inspectorSource = fs.readFileSync(
  new URL(
    "../lib/website-builder/inspector-registry.js",
    import.meta.url
  ),
  "utf8"
);

test(
  "MSE-25.6 expose le catalogue publié via le Website Builder",
  () => {
    assert.match(
      routeSource,
      /\/public\/destinations\?status=published/
    );

    assert.match(
      routeSource,
      /x-tenant-slug/
    );

    assert.match(
      routeSource,
      /cache:\s*"no-store"/
    );
  }
);

test(
  "MSE-25.6 fournit un client catalogue destinations au Designer",
  () => {
    assert.match(
      apiSource,
      /fetchPublishedDestinations/
    );

    assert.match(
      apiSource,
      /\/api\/website-builder\/destinations/
    );

    assert.match(
      apiSource,
      /payload\?\.items/
    );
  }
);

test(
  "MSE-25.6 conserve le bloc destinations du vrai Website Designer",
  () => {
    assert.match(
      inspectorSource,
      /destinations/
    );
  }
);
