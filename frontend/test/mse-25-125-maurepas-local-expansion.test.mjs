import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL(
    "../lib/seo/local-area-config.js",
    import.meta.url,
  ),
  "utf8",
);

test(
  "Maurepas has an explicit six-city catchment without doorway pages",
  () => {
    const expected = [
      "Élancourt",
      "Coignières",
      "La Verrière",
      "Jouars-Pontchartrain",
      "Le Mesnil-Saint-Denis",
      "Trappes",
    ];

    assert.match(
      source,
      /"ambassade-fram-mondescale-maurepas"\s*:\s*\[/,
    );

    for (const city of expected) {
      assert.ok(
        source.includes(`"${city}"`),
        `missing Maurepas catchment city: ${city}`,
      );
    }

    assert.equal(expected.length, 6);
  },
);
