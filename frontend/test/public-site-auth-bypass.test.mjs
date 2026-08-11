import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const proxy = await readFile(new URL("../proxy.js", import.meta.url), "utf8");

test("public agency routes bypass Basic Auth", () => {
  assert.match(proxy, /pathname === "\/agence"/);
  assert.match(proxy, /pathname\.startsWith\("\/agence\/"\)/);
});

test("public media and brand runtime bypass Basic Auth", () => {
  assert.match(proxy, /pathname === "\/media"/);
  assert.match(proxy, /pathname\.startsWith\("\/media\/"\)/);
  assert.match(proxy, /pathname === "\/api\/public-brand-legal"/);
  assert.match(proxy, /pathname\.startsWith\("\/api\/public-brand-legal\/"\)/);
});

test("SEO discovery files bypass Basic Auth", () => {
  assert.match(proxy, /pathname === "\/robots\.txt"/);
  assert.match(proxy, /pathname === "\/sitemap\.xml"/);
});

test("non-public Local Engine routes remain behind Basic Auth", () => {
  assert.match(proxy, /BASIC_AUTH_USERNAME/);
  assert.match(proxy, /BASIC_AUTH_PASSWORD/);
  assert.match(proxy, /WWW-Authenticate/);
  assert.match(proxy, /status: 401/);
});
