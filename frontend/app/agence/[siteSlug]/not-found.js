export default function PublicAgencyNotFound() {
  const showcaseUrl =
    process.env.NEXT_PUBLIC_SHOWCASE_URL ||
    "https://mondescale.com";

  return (
    <section className="public-site-section">
      <div className="public-site-container public-site-prose">
        <p className="public-site-eyebrow">Page introuvable</p>
        <h1>Cette page n’est plus disponible</h1>
        <p>
          Le contenu demandé n’existe pas ou n’est plus publié. Vous pouvez poursuivre
          votre navigation sur le site Mondescale.
        </p>
        <div className="public-site-hero-actions">
          <a className="public-site-button" href={showcaseUrl}>
            Découvrir Mondescale
          </a>
        </div>
      </div>
    </section>
  );
}
