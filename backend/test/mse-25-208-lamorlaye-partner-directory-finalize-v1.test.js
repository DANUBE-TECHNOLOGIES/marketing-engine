"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const source =
  fs.readFileSync(
    path.join(
      __dirname,
      "../scripts/mse-25-208-lamorlaye-partner-directory-finalize-v1.js"
    ),
    "utf8"
  );

test(
  "targets exact Partners trigger",
  () => {
    assert.match(
      source,
      /cmsztn4m400i6tdhd1z398m2t/
    );

    assert.match(
      source,
      /cms8n8my200kjn91a7p89a4v6/
    );
  }
);

test(
  "preserves post-208 SEO state",
  () => {
    assert.match(
      source,
      /Voyagistes & partenaires \| Mondescale Lamorlaye/
    );

    assert.match(
      source,
      /Voyagistes et partenaires de votre agence à Lamorlaye/
    );
  }
);

test(
  "restores public directory trigger",
  () => {
    assert.match(
      source,
      /visibleDesktop:\s*true/
    );

    assert.match(
      source,
      /visibleMobile:\s*true/
    );

    assert.match(
      source,
      /version:\s*3/
    );
  }
);

test(
  "does not mutate catalog",
  () => {
    assert.doesNotMatch(
      source,
      /create\s*\(/
    );

    assert.doesNotMatch(
      source,
      /delete/
    );

    assert.doesNotMatch(
      source,
      /updateMany/
    );
  }
);

test(
  "has explicit rollback",
  () => {
    assert.match(
      source,
      /--rollback/
    );

    assert.match(
      source,
      /partner-directory-finalize-v1\.snapshot\.json/
    );
  }
);
