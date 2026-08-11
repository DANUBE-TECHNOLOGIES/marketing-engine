import { getShowcaseUrl } from "../../lib/showcase-url";

export default function LegalJourneyCta({ site }) {
  const showcaseUrl = getShowcaseUrl(site);

  return (
    <section className="public-site-legal-journey" aria-label="Découvrir les voyages Mondescale">
      <div className="public-site-container">
        <div className="public-site-legal-journey-card">
          <span className="public-site-legal-journey-icon" aria-hidden="true">◎</span>

          <div className="public-site-legal-journey-copy">
            <h2>Et si votre prochain voyage commençait ici&nbsp;?</h2>
            <p>
              Découvrez nos idées de voyages, nos destinations et laissez-vous inspirer
              pour votre prochain départ.
            </p>
          </div>

          <a
            className="public-site-legal-journey-button"
            href={showcaseUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Découvrir nos voyages
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
