import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const header = fs.readFileSync(
  "frontend/components/public-site/PublicSiteHeader.js",
  "utf8"
);

test("MSE-25.261 Melun uses temporary official TUI logo", () => {
  assert.match(
    header,
    /ambassade-fram-mondescale-melun[\s\S]*?\/partners\/tui-official\.webp/
  );

  assert.match(
    header,
    /data-public-brand-logo-source="melun-temporary-tui"/
  );
});

test("MSE-25.261 generic PublicBrandLogo remains fallback for other agencies", () => {
  assert.match(
    header,
    /ambassade-fram-mondescale-melun[\s\S]*?\?[\s\S]*?tui-official\.webp[\s\S]*?:[\s\S]*?<PublicBrandLogo/
  );
});

test("MSE-25.261 does not modify generic brand resolver", () => {
  const resolver = fs.readFileSync(
    "frontend/components/public-site/PublicBrandLogo.js",
    "utf8"
  );

  assert.doesNotMatch(resolver, /melun-temporary-tui/);
  assert.doesNotMatch(resolver, /ambassade-fram-mondescale-melun/);
});
