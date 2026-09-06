import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routePath = new URL(
  "../app/agence/[siteSlug]/inspiration/page.js",
  import.meta.url
);

const route = fs.readFileSync(
  routePath,
  "utf8"
);

test(
  "AQ consumes canonical V2 inspiration page blocks",
  () => {
    assert.match(
      route,
      /function inspirationCmsEditorial\(site,\s*page\)/
    );

    assert.match(
      route,
      /page\?\.contentBlocks/
    );

    assert.match(
      route,
      /page\?\.sections/
    );

    assert.match(
      route,
      /page\?\.blocks/
    );
  }
);

test(
  "AQ requires the CMS editorial block to be published",
  () => {
    assert.match(
      route,
      /status === "published"/
    );
  }
);

test(
  "AQ refuses historic generic seed copy",
  () => {
    assert.match(
      route,
      /legacySeed/
    );

    assert.match(
      route,
      /accompagne ses clients avec conseil, expertise et suivi personnalisé avant, pendant et après leur voyage/
    );

    assert.match(
      route,
      /legacySeed\.test\(text\)/
    );
  }
);

test(
  "AQ preserves generated heading fallback",
  () => {
    assert.match(
      route,
      /cmsTitle\.toLowerCase\(\)[\s\S]*?"inspirations voyage"/
    );

    assert.match(
      route,
      /inspirationHeading\(site\)/
    );
  }
);

test(
  "AQ renders curated CMS title and text",
  () => {
    assert.match(
      route,
      /const cmsEditorial[\s\S]*?inspirationCmsEditorial\([\s\S]*?site,[\s\S]*?inspirationPage/
    );

    assert.match(
      route,
      /cmsEditorial\?\.title[\s\S]*?\|\|[\s\S]*?inspirationHeading\(site\)/
    );

    assert.match(
      route,
      /cmsEditorial\?\.text[\s\S]*?\|\|[\s\S]*?inspirationIntroduction\(site\)/
    );
  }
);
