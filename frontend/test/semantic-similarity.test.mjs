import test from "node:test";
import assert from "node:assert/strict";

import {
  semanticSimilarity,
  similarCrossSitePages,
} from "../lib/seo/semantic-similarity.mjs";

test("semantic similarity ignores local city substitutions", () => {
  const left = "Notre agence de Gien vous accompagne pour préparer un circuit, une croisière et un voyage sur mesure avec un conseiller disponible avant et après le départ.";
  const right = "Notre agence de Dax vous accompagne pour préparer un circuit, une croisière et un voyage sur mesure avec un conseiller disponible avant et après le départ.";
  const score = semanticSimilarity(left, right, { ignored: ["Gien", "Dax"] });
  assert.ok(score > 0.7);
});

test("cross-site comparison only matches equivalent page kinds", () => {
  const repeated = "Préparez votre séjour avec un conseiller qui analyse vos dates, votre budget et vos envies. Nous comparons les solutions et suivons votre dossier avant, pendant et après le voyage. Cette expertise permet de construire un projet cohérent et personnalisé pour chaque voyageur.";
  const rows = [
    {
      url: "https://agences.mondescale.com/agence/gien/services",
      siteSlug: "gien",
      pageKind: "services",
      city: "Gien",
      wordCount: 140,
      visibleText: repeated,
    },
    {
      url: "https://agences.mondescale.com/agence/dax/services",
      siteSlug: "dax",
      pageKind: "services",
      city: "Dax",
      wordCount: 140,
      visibleText: repeated,
    },
    {
      url: "https://agences.mondescale.com/agence/dax/contact",
      siteSlug: "dax",
      pageKind: "contact",
      city: "Dax",
      wordCount: 140,
      visibleText: repeated,
    },
  ];

  const matches = similarCrossSitePages(rows, {
    threshold: 0.7,
    minimumWords: 100,
  });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].pageKind, "services");
});

test("distinct local content is not flagged", () => {
  const rows = [
    {
      url: "https://agences.mondescale.com/agence/gien/services",
      siteSlug: "gien",
      pageKind: "services",
      city: "Gien",
      wordCount: 150,
      visibleText: "Notre équipe accompagne surtout les projets de circuits accompagnés, croisières et voyages complexes nécessitant plusieurs prestations coordonnées et un suivi détaillé du dossier.",
    },
    {
      url: "https://agences.mondescale.com/agence/dax/services",
      siteSlug: "dax",
      pageKind: "services",
      city: "Dax",
      wordCount: 150,
      visibleText: "Pour une escapade balnéaire ou un séjour bien-être, nos conseillers étudient la saison, l'emplacement de l'hôtel et les activités souhaitées afin de proposer une solution adaptée.",
    },
  ];

  assert.equal(
    similarCrossSitePages(rows, { threshold: 0.7, minimumWords: 100 }).length,
    0
  );
});
