"use client";
import { useEffect, useState } from "react";

export default function OffresAmbassade({ agencyId, siteSlug }) {
  const [state, setState] = useState({ loading: true, offers: [], flash: [], error: "" });
  useEffect(() => {
    const validAgency = Number.isSafeInteger(agencyId) && agencyId > 0;
    const validSite = typeof siteSlug === "string" && /^[a-z0-9][a-z0-9-]{0,119}$/.test(siteSlug);
    if (!validAgency && !validSite) {
      setState({ loading: false, offers: [], flash: [], error: "Agence non sélectionnée." });
      return;
    }
    const controller = new AbortController();
    setState({ loading: true, offers: [], flash: [], error: "" });
    const endpoint = validSite
      ? `/api/public/ambassade-fram/sites/${encodeURIComponent(siteSlug)}/offers`
      : `/api/public/ambassade-fram/agencies/${agencyId}/offers`;
    fetch(endpoint, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Offres indisponibles");
        return response.json();
      })
      .then(data => {
        if (!controller.signal.aborted) setState({
          loading: false,
          offers: Array.isArray(data.monthlyExclusives) ? data.monthlyExclusives : [],
          flash: Array.isArray(data.flashSales) ? data.flashSales : [],
          error: "",
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ loading: false, offers: [], flash: [], error: "Offres indisponibles actuellement." });
      });
    return () => controller.abort();
  }, [agencyId, siteSlug]);
  if (state.loading) return <p>Chargement des offres…</p>;
  if (state.error) return <p role="status">{state.error}</p>;
  if (!state.offers.length && !state.flash.length) return <p>Aucune offre publiée actuellement pour cette agence.</p>;
  const renderOffer = offer => (
    <article key={offer.id}>
      {typeof offer.imageUrl === "string" && offer.imageUrl.startsWith("https://") && <img src={offer.imageUrl} alt={offer.title} loading="lazy" decoding="async" style={{ width: "100%", maxWidth: 640, height: "auto", borderRadius: 12 }} />}
      <h3>{offer.title}</h3>
      {offer.description && <p>{offer.description}</p>}
      {Number.isSafeInteger(offer.priceCents) && <p>À partir de {(offer.priceCents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p>}
      {offer.terms && <p><small>{offer.terms}</small></p>}
      {offer.quoteUrl?.startsWith("https://") && <p><a href={offer.quoteUrl} rel="noopener noreferrer">Demander un devis</a></p>}
    </article>
  );
  return (
    <section aria-label="Offres Ambassade FRAM">
      <h2>Les Exclus Ambassade FRAM</h2>
      {state.offers.map(renderOffer)}
      {state.flash.length > 0 && <><h2>Ventes flash FRAM</h2>{state.flash.map(renderOffer)}</>}
    </section>
  );
}
