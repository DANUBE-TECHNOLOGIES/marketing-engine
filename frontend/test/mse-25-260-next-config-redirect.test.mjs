import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("next.config.js", "utf8");

test("MSE-25.260 Next config permanently redirects legacy Melun root", () => {
  assert.match(
    source,
    /source:\s*["']\/agence\/tui-store-melun["'][\s\S]*?destination:\s*["']\/agence\/ambassade-fram-mondescale-melun["'][\s\S]*?permanent:\s*true/
  );
});

test("MSE-25.260 Next config permanently redirects legacy Melun descendants", () => {
  assert.match(
    source,
    /source:\s*["']\/agence\/tui-store-melun\/:path\*["'][\s\S]*?destination:\s*["']\/agence\/ambassade-fram-mondescale-melun\/:path\*["'][\s\S]*?permanent:\s*true/
  );
});
