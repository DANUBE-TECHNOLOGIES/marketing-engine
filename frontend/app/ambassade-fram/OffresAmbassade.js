"use client";
import { useEffect, useState } from "react";

export default function OffresAmbassade({ agencyId }) {
  const [state, setState] = useState({ loading: true, offers: [], flash: [], error: "" });
  useEffect(() => {
    if (!Number.isSafeInteger(agencyId) || agencyId <= 0) {
      setState({ loading: false, offers: [], flash: [], error: "Agence non sélectionnée." });
      return;
    }
    const controller = new AbortController();
    setState({ loading: true, offers: [], flash: [], error: "" });
    fetch(`/api/public/ambassade-fram/agencies/${agencyId}/offers`, { signal: controller.signal })
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
  }, [agencyId]);
  if (state.loading) return <p>Chargement des offres…</p>;
  if (state.error) return <p role="status">{state.error}</p>;
  if (!state.offers.length && !state.flash.length) return <p>Aucune offre publiée actuellement pour cette agence.</p>;
  const renderOffer = offer => (
    <article key={offer.id}>
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
