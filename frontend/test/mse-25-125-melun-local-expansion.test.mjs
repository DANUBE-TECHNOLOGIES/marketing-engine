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
  "Melun has an explicit local catchment without doorway pages",
  () => {
    const expected = [
      "Dammarie-les-Lys",
      "Le Mée-sur-Seine",
      "Vaux-le-Pénil",
      "La Rochette",
      "Rubelles",
      "Vert-Saint-Denis",
    ];

    assert.match(
      source,
      /"tui-store-melun"\s*:\s*\[/,
    );

    for (const city of expected) {
      assert.ok(
        source.includes(`"${city}"`),
        `missing Melun catchment city: ${city}`,
      );
    }
  },
);
