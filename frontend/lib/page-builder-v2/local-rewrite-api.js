"use strict";

import { serializePage } from "./page-builder-state";

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return { message: text }; }
}

function uniquenessUrl(site, page) {
  if (!site?.agencyId || !page) throw new Error("La page ou l’agence est invalide.");
  const slug = page?.slug ? encodeURIComponent(page.slug) : "home";
  return `/api/website-builder/agencies/${encodeURIComponent(site.agencyId)}/pages/${slug}/uniqueness`;
}

async function post(site, page, body) {
  const response = await fetch(uniquenessUrl(site, page), {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(payload?.message || payload?.error || `Assistance locale indisponible (${response.status}).`);
  return payload;
}

export function fetchDraftUniqueness(site, page) {
  return post(site, page, { page: serializePage(page) });
}

export function proposeLocalRewrite(site, page, blockId) {
  if (!blockId) throw new Error("Sélectionnez un bloc avant de demander une réécriture locale.");
  return post(site, page, {
    action: "rewrite",
    blockId,
    page: serializePage(page),
  });
}
