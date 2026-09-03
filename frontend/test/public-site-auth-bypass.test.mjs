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

test("published inspiration GET routes bypass Basic Auth without opening writes", () => {
  assert.match(proxy, /pathname === "\/api\/website-builder\/inspirations"/);
  assert.match(proxy, /pathname\.startsWith\("\/api\/website-builder\/inspirations\/"\)/);
  assert.match(proxy, /request\.method === "GET"/);
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

test("public agences hostname never falls through to Basic Auth", () => {
  assert.match(
    proxy,
    /requestHostname\(request\) === PUBLIC_SITE_HOST/
  );

  assert.match(
    proxy,
    /status:\s*404/
  );

  const publicHostGuard =
    proxy.indexOf(
      "requestHostname(request) === PUBLIC_SITE_HOST"
    );

  const basicAuth =
    proxy.indexOf(
      "const authorization"
    );

  assert.ok(
    publicHostGuard >= 0,
    "public hostname guard must exist"
  );

  assert.ok(
    basicAuth >= 0,
    "Basic Auth block must exist"
  );

  assert.ok(
    publicHostGuard < basicAuth,
    "public hostname guard must run before Basic Auth"
  );
});
