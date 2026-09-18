import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(
  import.meta.dirname,
  ".."
);

function source(file) {
  return fs.readFileSync(
    path.join(root, file),
    "utf8"
  );
}

test(
  "MSE-25.246 passes directional intelligence into territorial cockpit",
  () => {
    const page = source(
      "app/ranking-grid/page.js"
    );

    assert.match(
      page,
      /directionalIntelligence=\{directionalIntelligence\}/
    );
  }
);

test(
  "MSE-25.246 uses V2 weakest quadrant instead of legacy cardinal direction",
  () => {
    const panel = source(
      "app/ranking-grid/TerritorialSeoPanel.js"
    );

    assert.match(
      panel,
      /worstQuadrant/
    );

    assert.match(
      panel,
      /Zone de faiblesse prioritaire/
    );

    assert.match(
      panel,
      /directionLabel/
    );

    assert.match(
      panel,
      /Décrochage territorial/
    );
  }
);

test(
  "MSE-25.246 keeps territorial action tracking",
  () => {
    const panel = source(
      "app/ranking-grid/TerritorialSeoPanel.js"
    );

    assert.match(
      panel,
      /TerritorialActionTracker/
    );

    assert.match(
      panel,
      /initialActions/
    );
  }
);
