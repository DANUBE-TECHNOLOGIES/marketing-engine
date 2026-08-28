import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const proxyPath = path.resolve(__dirname, "../proxy.js");

test("MSE-25.71 compact SSR route bypasses Local Engine Basic Auth", () => {
  const source = fs.readFileSync(proxyPath, "utf8");

  assert.match(source, /pathname === "\/api\/public-render-sites"/);
  assert.match(source, /pathname\.startsWith\("\/api\/public-render-sites\/"\)/);
});
