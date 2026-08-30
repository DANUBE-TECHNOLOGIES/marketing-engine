import Link from "next/link";

function siteRoot(site) {
  return String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`).replace(/\/$/, "");
}

function cityName(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

const BEFORE = [
  ["Transports et hébergements", "Aérien, train, hôtels et location de voiture avec accès aux offres et tarifs négociés du réseau."],
  ["Optimisation des déplacements", "Recherche des combinaisons tarifaires et des temps de parcours adaptés à vos contraintes professionnelles."],
  ["Réservation accompagnée ou en ligne", "Un accompagnement humain en agence complété, selon vos besoins, par des solutions de réservation en ligne et des circuits de validation."],
];

const DURING = [
  ["Assistance 24h/24 et 7j/7", "Une permanence téléphonique permet d'obtenir de l'aide pendant les déplacements, y compris en dehors des heures d'ouverture de l'agence."],
  ["Sécurité et accompagnement", "Des solutions de suivi, d'assistance et de géolocalisation peuvent accompagner votre devoir de protection envers les collaborateurs en déplacement."],
  ["Services de mobilité", "Transferts, VTC, location de voiture, parking avec voiturier et services complémentaires facilitent le parcours du voyageur."],
];

const AFTER = [
  ["Reporting et pilotage", "Des données de suivi permettent d'analyser l'activité voyages, les marchés, les fournisseurs et les principaux postes de dépenses."],
  ["Paiements centralisés", "Des solutions de paiement centralisé peuvent réduire les avances de frais et faciliter le rapprochement entre réservations, paiements et factures."],
  ["Facturation simplifiée", "La dématérialisation facilite la consultation, le suivi, l'archivage et l'intégration des factures dans les processus comptables."],
];

function CardGrid({ items }) {
  return (
    <div className="public-site-card-grid" data-columns="3">
      {items.map(([title, text]) => (
        <article className="public-site-card public-site-feature-card" key={title}>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  );
}

export default function BusinessTravelPage({ site }) {
  const city = cityName(site);
  const root = siteRoot(site);
  const agencyLabel = city ? `notre agence de ${city}` : "notre agence";

  return (
    <main className="public-site-business-travel">
      <section className="public-site-section public-site-page-heading">
        <div className="public-site-container public-site-prose">
          <p className="public-site-eyebrow">Voyages professionnels</p>
          <h1>Business Travel : vos voyages d’affaires accompagnés de A à Z</h1>
          <p className="public-site-section-intro">
            Vous vous concentrez sur votre activité, nous organisons et sécurisons les déplacements de vos collaborateurs. {city ? `À ${city}, ` : ""}{agencyLabel} vous accompagne avec une organisation souple, des solutions de réservation adaptées et un suivi avant, pendant et après chaque voyage.
          </p>
          <div className="public-site-related-links">
            <Link href={`${root}/contact`}>Parler de vos déplacements professionnels</Link>
          </div>
        </div>
      </section>

      <section className="public-site-section public-site-features">
        <div className="public-site-container">
          <p className="public-site-section-kicker">Avant le voyage</p>
          <h2>Réserver mieux, selon votre politique voyages</h2>
          <p className="public-site-section-intro">Nous combinons expertise humaine, puissance d’achat du réseau et outils de réservation pour construire des déplacements efficaces et maîtrisés.</p>
          <CardGrid items={BEFORE} />
        </div>
      </section>

      <section className="public-site-section public-site-features">
        <div className="public-site-container">
          <p className="public-site-section-kicker">Pendant le voyage</p>
          <h2>Vos collaborateurs ne voyagent pas seuls</h2>
          <p className="public-site-section-intro">Modification, annulation, nouvel hôtel, transport ou imprévu : l’accompagnement se poursuit lorsque le voyage a commencé.</p>
          <CardGrid items={DURING} />
        </div>
      </section>

      <section className="public-site-section public-site-features">
        <div className="public-site-container">
          <p className="public-site-section-kicker">Après le voyage</p>
          <h2>Des déplacements plus simples à piloter</h2>
          <p className="public-site-section-intro">Le voyage d’affaires ne s’arrête pas au retour : suivi des dépenses, reporting et facturation contribuent à mieux piloter votre budget voyages.</p>
          <CardGrid items={AFTER} />
        </div>
      </section>

      <section className="public-site-section public-site-features">
        <div className="public-site-container">
          <p className="public-site-section-kicker">Une offre complète</p>
          <h2>Des services adaptés aux voyageurs professionnels</h2>
          <div className="public-site-card-grid" data-columns="4">
            {[
              ["Assurances affaires", "Des formules adaptées aux déplacements professionnels, en France comme à l’étranger."],
              ["Application mobile", "Itinéraires, informations de vol, alertes et services utiles réunis pendant le déplacement."],
              ["Voyager mieux", "Des outils et alternatives permettent d’intégrer l’impact environnemental dans la politique voyages."],
              ["Accompagnement humain", "Un interlocuteur de proximité pour comprendre vos besoins et faire évoluer votre organisation voyages."],
            ].map(([title, text]) => (
              <article className="public-site-card public-site-feature-card" key={title}><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-site-section public-site-page-heading">
        <div className="public-site-container public-site-prose">
          <p className="public-site-eyebrow">Votre entreprise</p>
          <h2>Construisons votre organisation voyages</h2>
          <p>Chaque entreprise a ses contraintes, ses habitudes et ses priorités. Notre équipe peut étudier avec vous une organisation adaptée à vos voyageurs, à votre budget et à vos règles internes.</p>
          <div className="public-site-related-links">
            <Link href={`${root}/contact`}>{city ? `Contacter notre agence à ${city}` : "Contacter notre équipe"}</Link>
            <Link href={`${root}/services`}>Découvrir tous nos services</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export { cityName, siteRoot };
