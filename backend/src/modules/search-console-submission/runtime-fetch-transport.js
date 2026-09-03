"use strict";

function cleanOrigin(value) {
  return String(value || "").trim().replace(/\/+$/g, "");
}

function rewritePublicUrl(url, publicOrigin, fetchOrigin) {
  const source = cleanOrigin(publicOrigin);
  const target = cleanOrigin(fetchOrigin);
  const raw = String(url || "").trim();
  if (!source || !target || !raw.startsWith(`${source}/`) && raw !== source) return raw;
  return `${target}${raw.slice(source.length)}`;
}

function mapResponseUrl(url, publicOrigin, fetchOrigin, fallbackPublicUrl) {
  const source = cleanOrigin(fetchOrigin);
  const target = cleanOrigin(publicOrigin);
  const raw = String(url || "").trim();
  if (source && target && (raw === source || raw.startsWith(`${source}/`))) {
    return `${target}${raw.slice(source.length)}`;
  }
  return raw || fallbackPublicUrl || null;
}

function responseFacade(response, { publicOrigin, fetchOrigin, publicUrl }) {
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    redirected: response.redirected,
    type: response.type,
    url: mapResponseUrl(response.url, publicOrigin, fetchOrigin, publicUrl),
    text: () => response.text(),
    json: () => response.json(),
    arrayBuffer: () => response.arrayBuffer(),
  };
}

function createRuntimeFetchTransport({ fetchImpl = globalThis.fetch, publicOrigin, fetchOrigin } = {}) {
  const publicBase = cleanOrigin(publicOrigin);
  const transportBase = cleanOrigin(fetchOrigin);
  if (!transportBase || transportBase === publicBase) return fetchImpl;

  return async function runtimeFetch(publicUrl, options = {}) {
    const transportUrl = rewritePublicUrl(publicUrl, publicBase, transportBase);
    const headers = new Headers(options.headers || {});
    headers.set("X-Mondescale-Observed-Public-Url", String(publicUrl));
    const response = await fetchImpl(transportUrl, { ...options, headers });
    return responseFacade(response, {
      publicOrigin: publicBase,
      fetchOrigin: transportBase,
      publicUrl: String(publicUrl),
    });
  };
}

module.exports = {
  cleanOrigin,
  createRuntimeFetchTransport,
  mapResponseUrl,
  responseFacade,
  rewritePublicUrl,
};
