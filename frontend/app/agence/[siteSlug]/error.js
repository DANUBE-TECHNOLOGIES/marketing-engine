"use client";

export default function PublicAgencyError({ reset }) {
  return (
    <section className="public-site-section">
      <div className="public-site-container public-site-prose">
        <p className="public-site-eyebrow">Service momentanément indisponible</p>
        <h1>Nous n’arrivons pas à afficher cette page</h1>
        <p>
          Une erreur temporaire empêche le chargement du mini-site. Vous pouvez réessayer
          immédiatement sans quitter cette page.
        </p>
        <div className="public-site-hero-actions">
          <button
            type="button"
            className="public-site-button"
            onClick={() => reset()}
          >
            Réessayer
          </button>
        </div>
      </div>
    </section>
  );
}
