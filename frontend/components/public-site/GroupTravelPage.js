import Link from "next/link";

import styles from "./GroupTravelPage.module.css";

const GROUP_TYPES = [
  ["Associations & clubs", "Culture, sport, loisirs ou passion commune : nous adaptons le programme au rythme et aux attentes du groupe."],
  ["CSE & collectivités", "Une organisation claire, un budget cadré et des prestations pensées pour fédérer les participants."],
  ["Familles & groupes d’amis", "Anniversaire, retrouvailles, cousinade ou grand départ : nous coordonnons le projet pour tout le monde."],
  ["Groupes scolaires", "Transport, hébergement, visites et rythme du séjour sont construits autour du projet pédagogique et de l’encadrement."],
];

const TRIPS = [
  {
    destination: "Albanie",
    format: "Circuit",
    duration: "8 jours / 7 nuits",
    title: "Entre villes, montagnes et Riviera albanaise",
    text: "Un itinéraire de découverte mêlant patrimoine, paysages, villages et littoral, à ajuster selon le rythme et les centres d’intérêt de votre groupe.",
    image: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1400&q=88",
  },
  {
    destination: "Grèce",
    format: "Séjour",
    duration: "7 à 10 nuits",
    title: "Une île grecque comme point de ralliement",
    text: "Un séjour confortable pour se retrouver, avec hébergement adapté, transferts, excursions facultatives et temps libres à composer ensemble.",
    image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=88",
  },
  {
    destination: "Méditerranée",
    format: "Croisière",
    duration: "8 jours / 7 nuits",
    title: "Plusieurs escales, un seul voyage de groupe",
    text: "Cabines regroupées, acheminements et options coordonnées : une formule particulièrement simple pour faire voyager des participants aux profils variés.",
    image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1400&q=88",
  },
  {
    destination: "Europe",
    format: "Week-end",
    duration: "3 à 4 jours",
    title: "Une capitale pour partager un temps fort",
    text: "Lisbonne, Rome, Prague ou Budapest : quelques jours suffisent pour créer un programme dense, convivial et facile à partager.",
    image: "https://images.unsplash.com/photo-1519671282429-b44660ead0a7?auto=format&fit=crop&w=1400&q=88",
  },
  {
    destination: "Afrique australe",
    format: "Grand voyage",
    duration: "10 à 14 jours",
    title: "Safari et grands espaces en petit groupe",
    text: "Un projet d’exception construit autour des temps de safari, des étapes, des hébergements et des moments collectifs qui donneront son identité au voyage.",
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1400&q=88",
  },
  {
    destination: "Votre idée",
    format: "Sur mesure",
    duration: "À construire",
    title: "Votre groupe, votre propre voyage",
    text: "Une destination en tête, une date commune ou simplement une envie de partir ensemble ? Nous partons de votre projet pour créer le voyage de A à Z.",
    image: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1400&q=88",
  },
];

const STEPS = [
  ["Étape 1", "Votre projet", "Participants, période, destination, budget, niveau de confort et contraintes : nous posons les bases."],
  ["Étape 2", "La conception", "Nous construisons la combinaison transport, hébergement, visites, restauration et services la plus cohérente."],
  ["Étape 3", "La préparation", "Réservations, échéances, documents et informations pratiques sont centralisés avec votre interlocuteur."],
  ["Étape 4", "Le voyage", "Votre agence suit le dossier jusqu’au départ et reste votre point de contact pendant l’organisation du séjour."],
];

function siteRoot(site) {
  return String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`).replace(/\/$/, "");
}

function cityName(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

export default function GroupTravelPage({ site }) {
  const city = cityName(site);
  const root = siteRoot(site);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Voyages en groupe</p>
          <h1>Voyager ensemble, sans voyager comme tout le monde</h1>
          <p className={styles.heroText}>
            {city
              ? `Depuis ${city}, notre équipe conçoit des voyages pour associations, familles, groupes d’amis, CSE, collectivités et projets scolaires.`
              : "Notre équipe conçoit des voyages pour associations, familles, groupes d’amis, CSE, collectivités et projets scolaires."}
            {" "}Vous gardez un interlocuteur unique pour imaginer, organiser et suivre l’ensemble du projet.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href={`${root}/contact`}>Parler de mon projet</Link>
            <a className={styles.secondaryCta} href="#inspirations">Voir les idées de voyages</a>
          </div>
        </div>
      </section>

      <nav className={styles.quickNav} aria-label="Formats de voyages en groupe">
        <a href="#inspirations">Circuits</a>
        <a href="#inspirations">Croisières</a>
        <a href="#inspirations">Séjours</a>
        <a href="#inspirations">Week-ends</a>
      </nav>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeaderCentered}>
            <p className={styles.eyebrow}>À chacun son projet</p>
            <h2>Des voyages pensés pour votre groupe, pas l’inverse</h2>
            <p>Le nombre de participants n’est qu’un point de départ. Nous adaptons surtout le rythme, les prestations, les temps forts et le niveau d’accompagnement au profil réel du groupe.</p>
          </div>
          <div className={styles.groupGrid}>
            {GROUP_TYPES.map(([title, text], index) => (
              <article className={styles.groupCard} key={title}>
                <div className={styles.groupNumber}>{String(index + 1).padStart(2, "0")}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionSoft} id="inspirations">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Quelques idées pour partir ensemble</p>
            <h2>Des voyages concrets pour vous projeter</h2>
            <p>Ces propositions sont des inspirations. Destination, durée, départ, programme, hébergement et prestations peuvent être retravaillés avec votre conseiller pour correspondre à votre groupe.</p>
          </div>
          <div className={styles.inspirationGrid}>
            {TRIPS.map((trip, index) => (
              <article className={`${styles.tripCard} ${index < 2 ? styles.tripCardLarge : ""}`} key={`${trip.destination}-${trip.title}`}>
                <div className={styles.tripImage} style={{ backgroundImage: `url(${trip.image})` }} aria-hidden="true" />
                <div className={styles.tripBody}>
                  <div className={styles.tripMeta}>
                    <span>{trip.destination}</span>
                    <span>{trip.format}</span>
                    <span>{trip.duration}</span>
                  </div>
                  <h3>{trip.title}</h3>
                  <p>{trip.text}</p>
                  <Link className={styles.tripLink} href={`${root}/contact`}>Imaginer ce voyage avec mon agence →</Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionDark}>
        <div className={styles.container}>
          <div className={styles.sectionHeaderCentered}>
            <p className={styles.eyebrow}>Notre accompagnement</p>
            <h2>De la première idée jusqu’au départ</h2>
            <p>Un dossier groupe demande de la coordination. Nous vous aidons à garder une vision claire du projet et de ses échéances.</p>
          </div>
          <div className={styles.steps}>
            {STEPS.map(([number, title, text]) => (
              <article className={styles.step} key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.ctaPanel}>
            <div className={styles.ctaImage} aria-hidden="true" />
            <div className={styles.ctaContent}>
              <p className={styles.eyebrow}>Construisons votre voyage</p>
              <h2>Une date, une destination ou simplement l’envie de partir ensemble ?</h2>
              <p>Indiquez-nous le nombre approximatif de participants, la période envisagée et les grandes lignes de votre projet. Nous construirons avec vous une proposition adaptée au groupe.</p>
              <Link href={`${root}/contact`}>{city ? `Présenter mon projet à l’agence de ${city}` : "Présenter mon projet de groupe"}</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export { cityName, siteRoot };
