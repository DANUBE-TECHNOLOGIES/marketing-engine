import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function read(relativePath) {
  return fs.readFileSync(
    new URL(relativePath, import.meta.url),
    "utf8"
  );
}

const routeSource = read(
  "../app/api/website-builder/destinations/route.js"
);
const apiSource = read(
  "../lib/page-builder-v2/page-builder-api.js"
);
const registrySource = read(
  "../lib/website-builder/inspector-registry.js"
);
const sectionInspectorSource = read(
  "../components/website-builder/SectionInspector.js"
);
const rendererSource = read(
  "../components/public-site/renderers/DestinationsRenderer.js"
);
const publicCatalogSource = read(
  "../../backend/src/routes/publicCatalog.js"
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
  "MSE-25.6 scope le catalogue public des destinations par tenant",
  () => {
    assert.match(
      publicCatalogSource,
      /function destinationWhere\(req\)/
    );

    assert.match(
      publicCatalogSource,
      /tenant:[\s\S]*?is:[\s\S]*?slug:\s*tenantSlug\(req\)/
    );

    assert.match(
      publicCatalogSource,
      /where:\s*destinationWhere\(req\)/
    );
  }
);

test(
  "MSE-25.6 expose Référentiel destinations et Saisie manuelle dans le vrai Inspector",
  () => {
    assert.match(
      registrySource,
      /label:\s*"Source des destinations"/
    );

    assert.match(
      registrySource,
      /\["travel-core",\s*"Référentiel destinations"\]/
    );

    assert.match(
      registrySource,
      /\["manual",\s*"Saisie manuelle"\]/
    );

    assert.match(
      registrySource,
      /key:\s*"limit"[\s\S]*?Nombre maximum de destinations/
    );
  }
);

test(
  "MSE-25.6 charge et persiste une sélection de destinationIds",
  () => {
    assert.match(
      sectionInspectorSource,
      /fetchPublishedDestinations/
    );

    assert.match(
      sectionInspectorSource,
      /DestinationReferenceSelector/
    );

    assert.match(
      sectionInspectorSource,
      /type="checkbox"/
    );

    assert.match(
      sectionInspectorSource,
      /block\.settings\?\.destinationIds/
    );

    assert.match(
      sectionInspectorSource,
      /onSettingChange\([\s\S]*?"destinationIds"/
    );
  }
);

test(
  "MSE-25.6 masque l'éditeur manuel en mode travel-core",
  () => {
    assert.match(
      sectionInspectorSource,
      /block\.type === "destinations"[\s\S]*?destinationSource === "travel-core"/
    );

    assert.match(
      sectionInspectorSource,
      /Destination Engine alimentent automatiquement ce bloc/
    );
  }
);

test(
  "MSE-25.6 fait respecter la source sélectionnée par le renderer public",
  () => {
    assert.match(
      rendererSource,
      /content\.__dataSource/
    );

    assert.match(
      rendererSource,
      /dynamicSource/
    );

    assert.match(
      rendererSource,
      /\["destinations",\s*"items"\]/
    );

    assert.match(
      rendererSource,
      /:\s*\["items"\]/
    );
  }
);
