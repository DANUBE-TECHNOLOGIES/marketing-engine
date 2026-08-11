import Link from "next/link";

export default function PublicAgencyNotFound() {
  return (
    <section className="public-site-section">
      <div className="public-site-container public-site-prose">
        <p className="public-site-eyebrow">Page introuvable</p>
        <h1>Cette page n’est plus disponible</h1>
        <p>
          Le contenu demandé n’existe pas ou n’est plus publié. Vous pouvez revenir à
          l’accueil de votre agence ou découvrir les inspirations voyage disponibles.
        </p>
        <div className="public-site-hero-actions">
          <Link className="public-site-button" href="/">
            Revenir à l’accueil
          </Link>
        </div>
      </div>
    </section>
  );
}
