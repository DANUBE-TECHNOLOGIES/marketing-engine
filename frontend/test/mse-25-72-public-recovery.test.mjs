import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function walk(directory) {
  const result = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push(...walk(full));
    } else {
      result.push(full);
    }
  }

  return result;
}

test("MSE-25.72 keeps the complete public partner asset catalogue", () => {
  const directory = path.join(root, "public", "partners");

  assert.equal(fs.existsSync(directory), true);

  const assets = walk(directory).filter((file) =>
    /\.(webp|png|jpe?g|svg)$/i.test(file)
  );

  assert.ok(
    assets.length >= 58,
    `expected at least 58 partner assets, got ${assets.length}`
  );
});

test("MSE-25.72 keeps manual partner logos in the public build", () => {
  const manual = path.join(root, "public", "partners", "manual");

  assert.equal(fs.existsSync(manual), true);

  const assets = walk(manual).filter((file) =>
    /\.(webp|png|jpe?g|svg)$/i.test(file)
  );

  assert.ok(
    assets.length > 0,
    "manual partner catalogue must not disappear again"
  );
});

test("MSE-25.72 hidden heroes cannot suppress the canonical page H1", () => {
  const source = fs.readFileSync(
    path.join(
      root,
      "app/agence/[siteSlug]/[[...pageSlug]]/page.js"
    ),
    "utf8"
  );

  assert.match(
    source,
    /import\s*\{\s*isSectionVisible\s*\}\s*from\s*"[^"]*blockUtils"/
  );

  assert.match(
    source,
    /pageSections\(page\)\.filter\(isSectionVisible\)\.some/
  );
});
