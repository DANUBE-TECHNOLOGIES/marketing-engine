import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const helper = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/ctaLinks.js"),
  "utf8",
);
const appointment = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/AppointmentRenderer.js"),
  "utf8",
);
const offers = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/OffersRenderer.js"),
  "utf8",
);
const payment = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/FlexiblePaymentRenderer.js"),
  "utf8",
);

test("MSE-25.190 shared CTA resolution has no implicit contact fallback", () => {
  assert.match(helper, /fallbackSlug = ""/);
  assert.match(helper, /if \(!value\) return fallback;/);
  assert.match(helper, /if \(isUnsafeHref\(value\)\) return null;/);
  assert.doesNotMatch(helper, /if \(isQuoteCtaLabel\(label\)\)/);
});

test("MSE-25.190 appointment drops invalid explicit hrefs", () => {
  assert.match(appointment, /resolvePublicCtaHref\(site, explicitHref, ""\)/);
  assert.match(appointment, /return href \? \{ label, href \} : null;/);
});

test("MSE-25.190 offers only render resolved explicit hrefs", () => {
  assert.match(offers, /const resolvedHref = resolvePublicCtaHref\(site, item\?\.href, ""\);/);
  assert.match(offers, /\{resolvedHref \? \(/);
  assert.doesNotMatch(offers, /resolvePublicCtaHref\(site, item\.href, "contact"\)/);
});

test("MSE-25.190 payment CTA requires a resolved href", () => {
  assert.match(payment, /const actionHref = action \? resolvePublicCtaHref\(site, action\.href, ""\) : null;/);
  assert.match(payment, /\{action && actionHref \? \(/);
  assert.match(payment, /href=\{actionHref\}/);
});
