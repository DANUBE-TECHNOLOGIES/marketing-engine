import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../components/brand-studio/SitePublicationPanel.js",
      import.meta.url
    ),
    "utf8"
  );

test(
  "le panneau interroge régulièrement le statut",
  () => {
    assert.match(
      source,
      /window\.setInterval/
    );

    assert.match(
      source,
      /fetchSitePublicationStatus/
    );

    assert.match(
      source,
      /1200/
    );
  }
);

test(
  "le panneau affiche la progression active",
  () => {
    assert.match(
      source,
      /activeProgress/
    );

    assert.match(
      source,
      /displayedPercentage/
    );

    assert.match(
      source,
      /currentPage/
    );

    assert.match(
      source,
      /site-publication-running__progress/
    );
  }
);

test(
  "le panneau traduit les étapes métier",
  () => {
    assert.match(
      source,
      /Vérification de la préparation/
    );

    assert.match(
      source,
      /Compensation en cours/
    );

    assert.match(
      source,
      /Finalisation/
    );

    assert.match(
      source,
      /Dépublication en cours/
    );
  }
);
