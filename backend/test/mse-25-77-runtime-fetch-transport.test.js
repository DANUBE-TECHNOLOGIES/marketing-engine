"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createRuntimeFetchTransport,
  rewritePublicUrl,
  mapResponseUrl,
} = require("../src/modules/search-console-submission/runtime-fetch-transport");

const PUBLIC = "https://agences.mondescale.com";
const INTERNAL = "http://frontend:3000";

test("MSE-25.77 rewrites only the transport origin", () => {
  assert.equal(
    rewritePublicUrl(`${PUBLIC}/agence/gien`, PUBLIC, INTERNAL),
    `${INTERNAL}/agence/gien`
  );
  assert.equal(
    rewritePublicUrl("https://example.com/x", PUBLIC, INTERNAL),
    "https://example.com/x"
  );
});

test("MSE-25.77 maps internal response URLs back to the public SEO origin", () => {
  assert.equal(
    mapResponseUrl(`${INTERNAL}/agence/gien`, PUBLIC, INTERNAL, `${PUBLIC}/agence/gien`),
    `${PUBLIC}/agence/gien`
  );
});

test("MSE-25.77 fetch transport preserves public semantics", async () => {
  let requestedUrl = null;
  let observedHeader = null;
  const fetchImpl = async (url, options) => {
    requestedUrl = url;
    observedHeader = options.headers.get("X-Mondescale-Observed-Public-Url");
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "text/html" }),
      redirected: false,
      type: "basic",
      url: `${INTERNAL}/agence/gien`,
      async text() { return "<html></html>"; },
      async json() { return {}; },
      async arrayBuffer() { return new ArrayBuffer(0); },
    };
  };

  const transport = createRuntimeFetchTransport({ fetchImpl, publicOrigin: PUBLIC, fetchOrigin: INTERNAL });
  const response = await transport(`${PUBLIC}/agence/gien`, { headers: { Accept: "text/html" } });

  assert.equal(requestedUrl, `${INTERNAL}/agence/gien`);
  assert.equal(observedHeader, `${PUBLIC}/agence/gien`);
  assert.equal(response.url, `${PUBLIC}/agence/gien`);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), "<html></html>");
});
