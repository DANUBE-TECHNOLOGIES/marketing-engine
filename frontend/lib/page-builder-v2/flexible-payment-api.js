"use strict";

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function siteEndpoint(siteSlug, suffix = "") {
  const slug = String(siteSlug || "").trim();
  if (!slug) throw new Error("Le mini-site est requis pour configurer le paiement flexible.");
  return `/api/agency-sites/${encodeURIComponent(slug)}/flexible-payment${suffix}`;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    cache: "no-store",
    ...options,
  });
  const payload = await readJson(response);
  if (!response.ok) {
    const error = new Error(
      payload?.error || payload?.message || `Opération paiement flexible impossible (${response.status}).`
    );
    error.code = payload?.code || "FLEXIBLE_PAYMENT_REQUEST_FAILED";
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function fetchFlexiblePaymentConfiguration(siteSlug) {
  return request(siteEndpoint(siteSlug));
}

export function previewFlexiblePayment(siteSlug, policy) {
  const body = policy === undefined ? {} : { policy };
  return request(siteEndpoint(siteSlug, "/preview"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function saveFlexiblePaymentPolicy(siteSlug, policy) {
  return request(siteEndpoint(siteSlug, "/policy"), {
    method: "PUT",
    body: JSON.stringify({ confirm: true, policy }),
  });
}

export function applyFlexiblePayment(siteSlug, previewFingerprint, policy) {
  const body = {
    confirm: true,
    previewFingerprint,
    ...(policy === undefined ? {} : { policy }),
  };
  return request(siteEndpoint(siteSlug, "/apply"), {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function rollbackFlexiblePayment(siteSlug, { pageId, blockId }) {
  return request(siteEndpoint(siteSlug, "/rollback"), {
    method: "POST",
    body: JSON.stringify({ confirm: true, pageId, blockId }),
  });
}
