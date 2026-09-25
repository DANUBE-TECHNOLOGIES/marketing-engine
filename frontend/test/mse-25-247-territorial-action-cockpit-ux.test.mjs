import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function source(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("MSE-25.247 keeps Wave 1 visible as immediate operational priority", () => {
  const tracker = source(
    "app/ranking-grid/TerritorialActionTracker.js"
  );

  assert.match(tracker, /À faire maintenant/);
  assert.match(tracker, /wave1\.map/);
  assert.match(tracker, /createWave1/);
  assert.match(tracker, /Suivre toute la Vague 1/);
});

test("MSE-25.247 collapses territorial detail by default", () => {
  const tracker = source(
    "app/ranking-grid/TerritorialActionTracker.js"
  );

  assert.match(
    tracker,
    /<details[\s\S]*key=\{territory\.city\}/
  );

  assert.match(
    tracker,
    /Voir les actions/
  );

  assert.match(
    tracker,
    /group-open:rotate-180/
  );
});

test("MSE-25.247 keeps territory actions and individual tracking controls", () => {
  const tracker = source(
    "app/ranking-grid/TerritorialActionTracker.js"
  );

  assert.match(
    tracker,
    /territory\.actions/
  );

  assert.match(
    tracker,
    /onClick=\{\(\) => create\(territory, recommendation\)\}/
  );

  assert.match(
    tracker,
    /alreadyTracked/
  );
});

test("MSE-25.247 collapses already tracked action detail", () => {
  const tracker = source(
    "app/ranking-grid/TerritorialActionTracker.js"
  );

  assert.match(
    tracker,
    /Actions déjà suivies/
  );

  assert.match(
    tracker,
    /Afficher le suivi détaillé/
  );

  assert.match(
    tracker,
    /\{actions\.length\} action\(s\)/
  );
});

test("MSE-25.247 preserves explicit-write safety", () => {
  const tracker = source(
    "app/ranking-grid/TerritorialActionTracker.js"
  );

  assert.doesNotMatch(
    tracker,
    /useEffect\([^]*createWave1\(/
  );

  assert.match(
    tracker,
    /method: "POST"/
  );

  assert.match(
    tracker,
    /method: "PATCH"/
  );
});
