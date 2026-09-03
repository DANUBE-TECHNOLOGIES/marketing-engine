"use strict";

const fs =
  require("node:fs");

const path =
  require("node:path");

const test =
  require("node:test");

const assert =
  require("node:assert/strict");

const SERVICE_FILE =
  path.resolve(
    __dirname,
    "../src/modules/publication-engine/service.js"
  );

function getCreateFragment() {
  const source =
    fs.readFileSync(
      SERVICE_FILE,
      "utf8"
    );

  const saveStart =
    source.indexOf(
      "async function saveVersion("
    );

  assert.notEqual(
    saveStart,
    -1
  );

  const createStart =
    source.indexOf(
      "tx.agencySitePageVersion.create",
      saveStart
    );

  assert.notEqual(
    createStart,
    -1
  );

  return source.slice(
    createStart,
    createStart + 1200
  );
}

test(
  "saveVersion utilise le bon delegate Prisma",
  () => {
    const fragment =
      getCreateFragment();

    assert.match(
      fragment,
      /tx\.agencySitePageVersion\.create\s*\(/
    );
  }
);

test(
  "saveVersion respecte le schéma AgencySitePageVersion",
  () => {
    const fragment =
      getCreateFragment();

    assert.match(
      fragment,
      /pageId\s*:/
    );

    assert.match(
      fragment,
      /version\s*:/
    );

    assert.match(
      fragment,
      /snapshot\s*,/
    );

    assert.match(
      fragment,
      /reason\s*:/
    );

    assert.match(
      fragment,
      /createdBy\s*,/
    );

    assert.doesNotMatch(
      fragment,
      /\bstatus\s*:/
    );

    assert.doesNotMatch(
      fragment,
      /\bchecksum\s*:/
    );

    assert.doesNotMatch(
      fragment,
      /\bactor\s*:/
    );

    assert.doesNotMatch(
      fragment,
      /\bsource\s*:/
    );
  }
);
