"use strict";

const crypto = require("node:crypto");

const VERSION =
  "mse-25.125aj-wave2-site-v1";

const TARGET = Object.freeze({
  agencyId: 6,
  campaignId: 11,
  siteSlug:
    "ambassade-fram-mondescale-bois-colombes",
});

const SITE_ACTION_IDS =
  Object.freeze([67, 69, 70, 71, 72]);

const OPERATIONAL_ACTION_IDS =
  Object.freeze([65, 66, 68]);

const WAVE1_CITIES = Object.freeze([
  "Levallois-Perret",
  "Asnières-sur-Seine",
  "Clichy",
  "Neuilly-sur-Seine",
]);

const WAVE2_SERVICE_CITIES =
  Object.freeze([
    "Colombes",
    "Courbevoie",
    "Gennevilliers",
    "La Garenne-Colombes",
  ]);

const EDITORIAL_HTML = [
  "<p>",
  "Vous habitez Levallois-Perret et préparez un voyage ? ",
  "Notre agence de Bois-Colombes vous accompagne dans la comparaison ",
  "des itinéraires, des hébergements et des formules proposées par ",
  "différents voyagistes, avec un interlocuteur identifié avant, ",
  "pendant et après votre séjour. ",
  '<a href="/agence/ambassade-fram-mondescale-bois-colombes">',
  "Découvrir l’agence Mondescale Bois-Colombes",
  "</a>.",
  "</p>",
].join("");

const SERVICE_SENTENCE =
  "L’agence accompagne également les voyageurs de Colombes, " +
  "Courbevoie, Gennevilliers et La Garenne-Colombes qui souhaitent " +
  "préparer leur séjour avec un conseiller de proximité à Bois-Colombes.";

function sha(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function stringsIn(value, path = "$", out = []) {
  if (typeof value === "string") {
    out.push({
      path,
      value,
    });

    return out;
  }

  if (Array.isArray(value)) {
    value.forEach(
      (item, index) =>
        stringsIn(
          item,
          `${path}[${index}]`,
          out
        )
    );

    return out;
  }

  if (
    value
    && typeof value === "object"
  ) {
    Object.entries(value).forEach(
      ([key, item]) =>
        stringsIn(
          item,
          `${path}.${key}`,
          out
        )
    );
  }

  return out;
}

function setAtPath(root, path, value) {
  const tokens = [];

  path
    .replace(/^\$\./, "")
    .replace(
      /\[(\d+)\]/g,
      ".$1"
    )
    .split(".")
    .filter(Boolean)
    .forEach(
      token => tokens.push(token)
    );

  let ref = root;

  for (
    let i = 0;
    i < tokens.length - 1;
    i += 1
  ) {
    ref = ref[tokens[i]];
  }

  ref[tokens[tokens.length - 1]] =
    value;
}

function findWave1TerritorialHtml(snapshot) {
  const strings =
    stringsIn(snapshot);

  const matches =
    strings.filter(({ value }) => {
      if (!value.includes("<p")) {
        return false;
      }

      return WAVE1_CITIES.every(
        city => value.includes(city)
      );
    });

  if (matches.length !== 1) {
    const error = new Error(
      "Expected exactly one current Wave1 " +
      "territorial HTML string; found=" +
      matches.length
    );

    error.code =
      "MSE_25_125AJ_TERRITORIAL_BLOCK_AMBIGUOUS";

    throw error;
  }

  return matches[0];
}

function extendTerritorialBlock(snapshot) {
  const current =
    findWave1TerritorialHtml(snapshot);

  if (
    WAVE2_SERVICE_CITIES.every(
      city =>
        current.value.includes(city)
    )
  ) {
    return {
      snapshot,
      changed: false,
      path: current.path,
    };
  }

  let html = current.value;

  const closing = html.lastIndexOf("</p>");

  if (closing < 0) {
    throw new Error(
      "Territorial paragraph has no closing </p>"
    );
  }

  html =
    html.slice(0, closing)
    + " "
    + SERVICE_SENTENCE
    + html.slice(closing);

  const next =
    structuredClone(snapshot);

  setAtPath(
    next,
    current.path,
    html
  );

  return {
    snapshot: next,
    changed: true,
    path: current.path,
  };
}

function addEditorialActivation(snapshot) {
  const strings =
    stringsIn(snapshot);

  if (
    strings.some(
      x =>
        x.value.includes(
          "Vous habitez Levallois-Perret " +
          "et préparez un voyage ?"
        )
    )
  ) {
    return {
      snapshot,
      changed: false,
    };
  }

  const candidates =
    strings.filter(
      x =>
        x.value.includes("<p")
        && x.path.endsWith(
          ".content.html"
        )
    );

  if (!candidates.length) {
    throw new Error(
      "No rich_text content.html found "
      + "for editorial activation"
    );
  }

  const target =
    candidates[candidates.length - 1];

  const next =
    structuredClone(snapshot);

  setAtPath(
    next,
    target.path,
    target.value + EDITORIAL_HTML
  );

  return {
    snapshot: next,
    changed: true,
    path: target.path,
  };
}

function buildPlan({
  agence,
  services,
  destinations,
  engagements,
}) {
  const source = {
    agence,
    services,
    destinations,
    engagements,
  };

  const sourceFingerprints =
    Object.fromEntries(
      Object.entries(source).map(
        ([slug, snapshot]) => [
          slug,
          sha(snapshot),
        ]
      )
    );

  const writes = [];

  for (const slug of [
    "agence",
    "services",
    "engagements",
  ]) {
    const result =
      extendTerritorialBlock(
        source[slug]
      );

    writes.push({
      pageSlug: slug,
      changed: result.changed,
      beforeFingerprint:
        sourceFingerprints[slug],
      body: result.snapshot,
      mutationPath:
        result.path || null,
    });
  }

  let destinationTerritory =
    extendTerritorialBlock(
      destinations
    );

  let destinationEditorial =
    addEditorialActivation(
      destinationTerritory.snapshot
    );

  writes.push({
    pageSlug: "destinations",
    changed:
      destinationTerritory.changed
      || destinationEditorial.changed,
    beforeFingerprint:
      sourceFingerprints.destinations,
    body:
      destinationEditorial.snapshot,
    mutationPath: [
      destinationTerritory.path,
      destinationEditorial.path,
    ].filter(Boolean),
  });

  return {
    version: VERSION,
    operation:
      "territorial-wave2-site-plan",
    target: TARGET,

    dryRun: true,
    providerCalls: 0,
    externalCalls: 0,

    siteActionIds:
      SITE_ACTION_IDS,

    operationalActionIds:
      OPERATIONAL_ACTION_IDS,

    sourceFingerprints,

    summary: {
      pageWriteCount:
        writes.filter(
          x => x.changed
        ).length,
      siteActionCount:
        SITE_ACTION_IDS.length,
      operationalActionCount:
        OPERATIONAL_ACTION_IDS.length,
    },

    writes,
  };
}

module.exports = {
  VERSION,
  TARGET,
  SITE_ACTION_IDS,
  OPERATIONAL_ACTION_IDS,
  SERVICE_SENTENCE,
  EDITORIAL_HTML,
  sha,
  stringsIn,
  findWave1TerritorialHtml,
  extendTerritorialBlock,
  addEditorialActivation,
  buildPlan,
};
