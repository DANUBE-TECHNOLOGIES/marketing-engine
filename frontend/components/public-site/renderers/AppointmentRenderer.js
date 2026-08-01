import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

export default function AppointmentRenderer({
  section,
  site,
}) {
  const content = getSectionContent(section);

  return (
    <section className="public-site-section public-site-appointment">
      <div className="public-site-container public-site-appointment-inner">
        <div>
          <p className="public-site-section-kicker">
            Rendez-vous personnalisé
          </p>

          <h2>
            {getSectionTitle(
              section,
              "Prenons le temps de parler de votre voyage"
            )}
          </h2>

          <p>
            {content.text ||
              "Choisissez un créneau pour échanger avec un conseiller."}
          </p>
        </div>

        <a
          className="public-site-button"
          href={`/sites/${site.slug}/contact`}
        >
          {content.primaryButton ||
            "Prendre rendez-vous"}
        </a>
      </div>
    </section>
  );
}
