import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function source(relativePath) {
  return fs.readFileSync(
    path.join(root, relativePath),
    "utf8"
  );
}

test(
  "MSE-25.5 expose Avis Google / Sélection manuelle dans le vrai Website Designer",
  () => {
    const registry = source(
      "lib/website-builder/inspector-registry.js"
    );

    assert.match(
      registry,
      /reviews:[\s\S]*?label:\s*"Source des avis"/
    );

    assert.match(
      registry,
      /\["google-reviews",\s*"Avis Google"\]/
    );

    assert.match(
      registry,
      /\["manual",\s*"Sélection manuelle"\]/
    );

    assert.match(
      registry,
      /reviews:[\s\S]*?collection:[\s\S]*?key:\s*"reviews"/
    );
  }
);

test(
  "MSE-25.5 masque la collection manuelle quand les avis Google sont automatiques",
  () => {
    const inspector = source(
      "components/website-builder/SectionInspector.js"
    );

    assert.match(
      inspector,
      /block\.type === "reviews"[\s\S]*?__dataSource === "google-reviews"/
    );

    assert.match(
      inspector,
      /Les avis Google publiés de cette agence alimentent automatiquement ce bloc/
    );
  }
);
