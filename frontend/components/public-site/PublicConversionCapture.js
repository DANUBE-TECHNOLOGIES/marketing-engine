"use client";

import { useEffect } from "react";

const TRACKABLE_ACTIONS = new Set([
  "quote_request",
  "contact",
  "phone",
  "email",
  "directions",
  "appointment",
  "payment_options",
  "destination_explore",
  "service_explore",
  "advisor_contact",
  "partner_outbound",
]);

function clean(value, max = 160) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function pageSlugFromPath(pathname, siteSlug) {
  const root = `/agence/${siteSlug}`;
  const suffix = String(pathname || "").startsWith(root)
    ? String(pathname || "").slice(root.length).replace(/^\/+|\/+$/g, "")
    : "";
  if (!suffix) return "home";
  const [first] = suffix.split("/");
  return first || "home";
}

function isPartnerContext(anchor) {
  return Boolean(
    anchor.closest?.("[data-partner-directory]") ||
    anchor.closest?.("[data-partner-id]") ||
    anchor.closest?.("[data-preferred-partner-id]")
  );
}

function inferAction(anchor) {
  const explicit = clean(anchor.dataset.conversionAction, 80).toLowerCase();
  if (TRACKABLE_ACTIONS.has(explicit)) return explicit;

  const href = String(anchor.getAttribute("href") || "").trim();
  const label = clean(anchor.textContent, 120).toLowerCase();
  const context = `${anchor.className || ""} ${anchor.closest("section")?.className || ""}`.toLowerCase();

  if (/^tel:/i.test(href)) return "phone";
  if (/^mailto:/i.test(href)) return "email";
  if (/google\.[^/]+\/maps|maps\.google|itin[eé]raire/.test(`${href} ${label}`)) return "directions";
  if (/paiement|payment/.test(`${label} ${context}`)) return "payment_options";
  if (/rendez-vous|appointment/.test(label)) return "appointment";
  if (/devis|quote/.test(label)) return "quote_request";
  if (/conseiller|équipe|equipe/.test(`${label} ${context}`) && /contact|échanger|parler|appeler/.test(label)) return "advisor_contact";
  if (/destination/.test(`${href} ${context}`)) return "destination_explore";
  if (/service/.test(`${href} ${context}`)) return "service_explore";
  if ((isPartnerContext(anchor) || /partner|partenaire/.test(context)) && /^https?:/i.test(href)) return "partner_outbound";
  if (/contact|nous contacter|parler|échanger/.test(`${href} ${label}`)) return "contact";
  return null;
}

function inferIntent(anchor, action, pageSlug) {
  const explicit = clean(anchor.dataset.conversionIntent, 80).toLowerCase();
  if (explicit) return explicit;
  const context = `${pageSlug} ${anchor.className || ""} ${anchor.closest("section")?.className || ""}`.toLowerCase();
  if (action === "payment_options" || /paiement|payment/.test(context)) return "flexible_payment";
  if (/billetterie|ticketing|vols?/.test(context)) return "flight_ticketing";
  if (action === "destination_explore" || /destination/.test(context)) return "destination";
  if (action === "service_explore" || /services?/.test(context)) return "service";
  if (action === "advisor_contact" || /equipe|équipe|team/.test(context)) return "advisor";
  if (action === "partner_outbound" || isPartnerContext(anchor) || /partenaires|partners/.test(context)) return "partners";
  if (["phone", "email", "directions", "contact", "appointment"].includes(action)) return "local_contact";
  return "general_travel";
}

function inferPlacement(anchor) {
  const explicit = clean(anchor.dataset.conversionPlacement, 120);
  if (explicit) return explicit;
  if (isPartnerContext(anchor)) return "public-site-partner-directory";
  const section = anchor.closest("section");
  if (section) {
    const stableClass = [...section.classList].find((name) => name.startsWith("public-site-"));
    if (stableClass) return stableClass;
  }
  if (anchor.closest("header")) return "public-site-header";
  if (anchor.closest("footer")) return "public-site-footer";
  return "public-site-link";
}

function sameOriginReferrerPath() {
  if (!document.referrer) return null;
  try {
    const referrer = new URL(document.referrer);
    return referrer.origin === window.location.origin ? referrer.pathname : null;
  } catch {
    return null;
  }
}

function dispatch(siteSlug, payload) {
  const endpoint = `/api/public-conversions/${encodeURIComponent(siteSlug)}/events`;
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      const sent = navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
      if (sent) return;
    }
  } catch {}
  fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => {});
}

export default function PublicConversionCapture({ siteSlug }) {
  useEffect(() => {
    if (!siteSlug) return undefined;

    function onClick(event) {
      if (event.defaultPrevented) return;
      const anchor = event.target?.closest?.("a[href]");
      if (!anchor || anchor.dataset.conversionTrack === "off") return;
      const action = inferAction(anchor);
      if (!action) return;
      const pageSlug = pageSlugFromPath(window.location.pathname, siteSlug);
      dispatch(siteSlug, {
        pageSlug,
        pagePath: window.location.pathname,
        intent: inferIntent(anchor, action, pageSlug),
        action,
        placement: inferPlacement(anchor),
        label: clean(anchor.dataset.conversionLabel || anchor.textContent, 160),
        target: anchor.href || anchor.getAttribute("href") || null,
        referrerPath: sameOriginReferrerPath(),
        occurredAt: new Date().toISOString(),
      });
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [siteSlug]);

  return null;
}

export { inferAction, inferIntent, inferPlacement, isPartnerContext, pageSlugFromPath };
