import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const proxySource = await readFile(
  new URL("../proxy.js", import.meta.url),
  "utf8"
);

test("Local Engine public mini-site paths redirect to agences.mondescale.com", () => {
  assert.match(proxySource, /PUBLIC_SITE_HOST = "agences\.mondescale\.com"/);
  assert.match(proxySource, /LOCAL_ENGINE_HOST = "localengine\.mondescale\.com"/);
  assert.match(proxySource, /canonicalPublicRedirect/);
  assert.match(proxySource, /NextResponse\.redirect\(target, 301\)/);
  assert.match(proxySource, /pathname === "\/agence"/);
  assert.match(proxySource, /pathname\.startsWith\("\/agence\/"\)/);
  assert.match(proxySource, /pathname === "\/sites"/);
  assert.match(proxySource, /pathname\.startsWith\("\/sites\/"\)/);
});
