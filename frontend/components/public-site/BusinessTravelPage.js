import Link from "next/link";
import styles from "./GroupTravelPage.module.css";
import { quoteRequestHref } from "./renderers/ctaLinks";

const BUSINESS_TRAVEL_HERO_IMAGE =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2400&q=88";

const BUSINESS_NEEDS = [
  ["Déplacements ponctuels", "Un rendez-vous, une mission, un salon ou un congrès : votre agence étudie avec vous les solutions de transport, d’hébergement et les contraintes du déplacement."],
  ["Voyages récurrents", "Pour des collaborateurs qui se déplacent régulièrement, nous pouvons organiser le besoin autour de vos habitudes, de vos priorités et du cadre défini par votre entreprise."],
  ["Équipes & événements", "Séminaire, réunion d’équipe ou déplacement collectif : nous coordonnons les composantes du voyage en tenant compte du nombre de participants et du programme."],
  ["Itinéraires plus complexes", "Plusieurs étapes, horaires contraints ou correspondances : votre conseiller peut comparer les options disponibles et construire un parcours cohérent avec votre besoin."],
];

const BUSINESS_SERVICES = [
  ["Transport", "Vol, train ou autre solution pertinente selon le trajet et les possibilités disponibles au moment de la demande."],
  ["Hébergement", "Recherche d’un hébergement adapté à la localisation, aux dates, au niveau de confort recherché et au budget communiqué."],
  ["Organisation", "Un même projet peut regrouper transport, hébergement et autres prestations utiles afin de simplifier la préparation du déplacement."],
  ["Conseil humain", "Votre agence reste votre interlocuteur pour étudier le projet, expliquer les options proposées et accompagner les ajustements avant le départ."],
];

const BUSINESS_STEPS = [
  ["Étape 1", "Votre besoin", "Destination, dates, voyageurs, contraintes horaires, budget et règles internes : nous cadrons le déplacement avec vous."],
  ["Étape 2", "Les options", "Votre conseiller recherche et compare les solutions disponibles correspondant aux critères communiqués."],
  ["Étape 3", "La réservation", "Après votre validation, les prestations retenues sont réservées selon leurs conditions tarifaires et contractuelles."],
  ["Étape 4", "Le suivi", "Votre agence reste le point de contact du dossier pour les demandes et ajustements pouvant être traités dans le cadre des prestations réservées."],
];

function cityName(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

function businessTravelHero(site) {
  const city = cityName(site);
  const title = city ? `Voyages d’affaires à ${city}` : "Voyages d’affaires";
  return {
    id: "business-travel-hero",
    type: "hero",
    title,
    content: {
      __builderType: "hero",
      eyebrow: "Voyages professionnels",
      title,
      text: city
        ? `Déplacements professionnels, missions, salons ou voyages d’équipe : construisez votre projet avec votre agence de ${city}.`
        : "Déplacements professionnels, missions, salons ou voyages d’équipe : construisez votre projet avec votre agence.",
      backgroundImage: BUSINESS_TRAVEL_HERO_IMAGE,
      imageAlt: title,
      backgroundPosition: "center 52%",
      overlayOpacity: 72,
      alignment: "left",
    },
  };
}

export default function BusinessTravelPage({ site }) {
  const city = cityName(site);
  const quote = quoteRequestHref(site, { source: "business" });
  const phone = String(site?.agency?.phone || "").trim();

  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(7,29,48,.88) 0%, rgba(7,29,48,.62) 44%, rgba(7,29,48,.12) 78%), url("${BUSINESS_TRAVEL_HERO_IMAGE}")`,
          backgroundPosition: "center 52%",
          backgroundSize: "cover",
        }}
      >
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Voyages professionnels</p>
          <h1>{city ? `Voyages d’affaires à ${city}` : "Voyages d’affaires"}</h1>
          <p className={styles.heroText}>
            {city ? `Un déplacement professionnel depuis ${city} ou ailleurs ? ` : "Un déplacement professionnel à organiser ? "}
            Votre agence vous aide à construire un voyage cohérent avec vos dates, vos contraintes et les besoins de votre entreprise.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryCta} href={quote}>Demander une étude de voyage</Link>
            {phone ? <a className={styles.secondaryCta} href={`tel:${phone.replace(/\s+/g, "")}`}>Appeler l’agence</a> : null}
          </div>
        </div>
      </section>

      <nav className={styles.quickNav} aria-label="Besoins voyages d’affaires">
        <a href="#besoins">Vos déplacements</a>
        <a href="#solutions">Organisation</a>
        <a href="#methode">Notre méthode</a>
        <Link href={quote}>Demander un devis</Link>
      </nav>

      <section className={styles.section} id="besoins">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCentered}>
            <p className={styles.eyebrow}>Votre activité ne s’arrête pas au trajet</p>
            <h2>Des déplacements professionnels pensés autour de votre besoin</h2>
            <p>Chaque mission a ses propres impératifs. Nous partons du déplacement réel à organiser plutôt que d’une formule standard.</p>
          </div>
          <div className={styles.groupGrid}>
            {BUSINESS_NEEDS.map(([title, text], index) => (
              <article className={styles.groupCard} key={title}>
                <div className={styles.groupNumber}>{String(index + 1).padStart(2, "0")}</div>
                <h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionSoft} id="solutions">
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>Une organisation plus simple</p>
            <h2>Transport, hébergement et coordination dans un même échange</h2>
            <p>Les solutions proposées dépendent de votre demande, des disponibilités et des conditions applicables au moment de la recherche.</p>
          </div>
          <div className={styles.groupGrid}>
            {BUSINESS_SERVICES.map(([title, text], index) => (
              <article className={styles.groupCard} key={title}>
                <div className={styles.groupNumber}>{String(index + 1).padStart(2, "0")}</div>
                <h3>{title}</h3><p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionDark} id="methode">
        <div className={styles.container}>
          <div className={styles.sectionHeaderCentered}>
            <p className={styles.eyebrow}>Comment ça se passe ?</p>
            <h2>Du besoin professionnel à la réservation</h2>
            <p>Vous nous transmettez le cadre du déplacement ; nous construisons l’échange autour des options réellement disponibles.</p>
          </div>
          <div className={styles.steps}>
            {BUSINESS_STEPS.map(([number, title, text]) => (
              <article className={styles.step} key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.ctaPanel}>
            <div className={styles.ctaImage} aria-hidden="true" />
            <div className={styles.ctaContent}>
              <p className={styles.eyebrow}>Votre prochain déplacement</p>
              <h2>{city ? `Parlez de votre projet à l’agence de ${city}` : "Parlez-nous de votre projet professionnel"}</h2>
              <p>Indiquez-nous les voyageurs concernés, les dates, la destination et vos principales contraintes. Le formulaire Business Travel transmet directement ces éléments à votre agence.</p>
              <Link href={quote}>Présenter mon besoin professionnel</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export {
  BUSINESS_NEEDS,
  BUSINESS_SERVICES,
  BUSINESS_STEPS,
  BUSINESS_TRAVEL_HERO_IMAGE,
  businessTravelHero,
  cityName,
};
