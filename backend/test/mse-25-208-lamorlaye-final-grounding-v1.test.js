"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const scriptPath =
  path.join(
    __dirname,
    "../scripts/mse-25-208-lamorlaye-final-grounding-v1.js"
  );

const source =
  fs.readFileSync(
    scriptPath,
    "utf8"
  );

test(
  "MSE-25.208 targets exact Lamorlaye site and pages",
  () => {
    assert.match(
      source,
      /cms8n8jdu00j7n91axodw128b/
    );

    assert.match(
      source,
      /cms8n8jen00j9n91a25i1tspp/
    );

    assert.match(
      source,
      /cms8n8ktg00jnn91avfhcvhjn/
    );

    assert.match(
      source,
      /cms8n8my200kjn91a7p89a4v6/
    );
  }
);

test(
  "MSE-25.208 fixes exact Home FAQ",
  () => {
    assert.match(
      source,
      /cmsztn4io00hqtdhdt0ljg243/
    );

    assert.match(
      source,
      /Pourquoi faire appel à une agence de voyages à Lamorlaye/
    );

    assert.match(
      source,
      /Pourquoi passer par une agence pour accueil/
    );
  }
);

test(
  "MSE-25.208 removes Agency placeholder identity",
  () => {
    assert.match(
      source,
      /cmsxhfhrs00dqp11ai52osmv6/
    );

    assert.match(
      source,
      /Votre équipe/
    );

    assert.match(
      source,
      /Conseillers voyages/
    );

    assert.match(
      source,
      /Stéphanie/
    );
  }
);

test(
  "MSE-25.208 reuses exact Stephanie asset",
  () => {
    assert.match(
      source,
      /cmsrqxgrr000kmn1a8d2q83va/
    );
  }
);

test(
  "MSE-25.208 removes Agency duplicate partner directory trigger",
  () => {
    assert.match(
      source,
      /cmsxhfhrs00drp11aaze0v3ea/
    );

    assert.match(
      source,
      /Agency duplicate partner catalog still visible/
    );
  }
);

test(
  "MSE-25.208 preserves real partner-directory contract",
  () => {
    assert.match(
      source,
      /cmt16t60i0014mo1a2667hg9c/
    );

    assert.match(
      source,
      /partner-directory/
    );

    assert.match(
      source,
      /catalogWrites: 0/
    );
  }
);

test(
  "MSE-25.208 localizes Partners editorial without inventing partners",
  () => {
    assert.match(
      source,
      /Comment votre agence de Lamorlaye utilise ce réseau de partenaires/
    );

    assert.match(
      source,
      /Les partenaires réellement étudiés dépendent donc de votre dossier/
    );
  }
);

test(
  "MSE-25.208 uses canonical Lamorlaye navigation",
  () => {
    assert.match(
      source,
      /\/agence\/mondescale-lamorlaye\/contact/
    );

    assert.match(
      source,
      /\/agence\/mondescale-lamorlaye\/services/
    );
  }
);

test(
  "MSE-25.208 is dry-run by default",
  () => {
    assert.match(
      source,
      /MSE_25_208_CONFIRM/
    );

    assert.match(
      source,
      /mutationPerformed: false/
    );
  }
);

test(
  "MSE-25.208 has explicit rollback snapshot",
  () => {
    assert.match(
      source,
      /mse-25-208-lamorlaye-final-grounding-v1\.snapshot\.json/
    );

    assert.match(
      source,
      /--rollback/
    );
  }
);

test(
  "MSE-25.208 does not create or delete site data",
  () => {
    assert.doesNotMatch(
      source,
      /prisma\.[A-Za-z0-9_]+\.create\s*\(/
    );

    assert.doesNotMatch(
      source,
      /prisma\.[A-Za-z0-9_]+\.delete/
    );

    assert.doesNotMatch(
      source,
      /prisma\.[A-Za-z0-9_]+\.updateMany/
    );
  }
);

test(
  "MSE-25.208 has no renderer or routing mutation",
  () => {
    assert.doesNotMatch(
      source,
      /writeFileSync\([^)]*(frontend|renderer|route|sitemap)/i
    );

    assert.doesNotMatch(
      source,
      /prisma\.(route|routing|canonical|sitemap)\./i
    );
  }
);
