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

const SERVICE_FILE =
  path.resolve(
    __dirname,
    "../src/modules/publication-engine/service.js"
  );

test(
  "saveVersion utilise agencySitePageVersion",
  () => {
    const source =
      fs.readFileSync(
        SERVICE_FILE,
        "utf8"
      );

    const markers = [
      source.indexOf(
        "async function saveVersion("
      ),

      source.indexOf(
        "function saveVersion("
      ),

      source.indexOf(
        "const saveVersion"
      ),
    ].filter(
      (
        position
      ) =>
        position >=
        0
    );

    assert.ok(
      markers.length >
      0
    );

    const start =
      Math.min(
        ...markers
      );

    const fragment =
      source.slice(
        start,
        start + 6000
      );

    assert.match(
      fragment,
      /(?:tx|prisma)\.agencySitePageVersion\.findFirst\s*\(/
    );

    assert.match(
      fragment,
      /(?:tx|prisma)\.agencySitePageVersion\.create\s*\(/
    );
  }
);
