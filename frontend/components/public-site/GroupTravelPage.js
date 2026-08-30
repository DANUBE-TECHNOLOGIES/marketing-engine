import Link from "next/link";

import HeroV2Renderer from "./renderers/HeroV2Renderer";

const GROUP_TYPES = [
  ["Associations et clubs", "Culture, loisirs, sport ou passion commune : nous construisons un programme adapté au rythme et aux attentes de votre groupe."],
  ["CSE et collectivités", "Séjours, circuits et escapades pensés pour fédérer les participants, avec une organisation claire et un budget maîtrisé."],
  ["Familles et groupes d’amis", "Anniversaire, retrouvailles ou simple envie de partir ensemble : un voyage personnalisé sans multiplier les démarches."],
  ["Groupes scolaires et éducatifs", "Transport, hébergement et programme sont organisés autour du projet, de l’âge des participants et des contraintes d’encadrement."],
];

const GROUP_JOURNEYS = [
  {
    type: "Circuit",
    destination: "Albanie",
    title: "Entre cités historiques et Riviera albanaise",
    duration: "8 jours / 7 nuits",
    text: "Un itinéraire collectif entre Tirana, Berat, Gjirokastër et la côte ionienne, à personnaliser selon le rythme et les centres d’intérêt de votre groupe.",
    image: "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?auto=format&fit=crop&w=1200&q=82",
  },
  {
    type: "Séjour",
    destination: "Îles grecques",
    title: "Une semaine au soleil à partager",
    duration: "8 jours / 7 nuits",
    text: "Hébergement, acheminement et temps forts organisés autour d’un point de chute commun, avec la liberté d’ajouter excursions et moments privatifs.",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=82",
  },
  {
    type: "Croisière",
    destination: "Méditerranée",
    title: "Plusieurs escales, un seul voyage de groupe",
    duration: "Selon itinéraire",
    text: "Une formule particulièrement adaptée aux groupes : cabines, acheminements et prestations coordonnées, tout en laissant à chacun son propre rythme à bord.",
    image: "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1200&q=82",
  },
  {
    type: "Escapade",
    destination: "Europe",
    title: "Capitales européennes le temps d’un week-end",
    duration: "3 à 4 jours",
    text: "Une parenthèse collective autour d’une ville, d’un événement ou d’une thématique, avec transport, hôtel, visites et temps libres assemblés sur mesure.",
    image: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=82",
  },
  {
    type: "Grand voyage",
    destination: "Afrique australe",
    title: "Safari et grands espaces en petit groupe",
    duration: "10 jours et +",
    text: "Un projet d’exception combinant étapes, safaris, hébergements et expériences, construit autour du budget, de la durée disponible et du profil des participants.",
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=1200&q=82",
  },
  {
    type: "Sur mesure",
    destination: "Votre destination",
    title: "Votre groupe, votre propre voyage",
    duration: "À définir ensemble",
    text: "Une destination en tête, une date ou simplement une envie ? Nous partons d’une page blanche pour imaginer un voyage qui n’appartient qu’à votre groupe.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=82",
  },
];

const STEPS = [
  ["1", "Votre projet", "Participants, destination, période, durée, budget, envies et contraintes : nous commençons par cadrer précisément votre demande."],
  ["2", "La conception", "Nous sélectionnons les partenaires et construisons une proposition cohérente : transport, hébergement, programme et prestations."],
  ["3", "La préparation", "Une fois le projet retenu, nous coordonnons les réservations et vous accompagnons dans la préparation pratique du départ."],
  ["4", "Le voyage", "Votre agence reste votre interlocuteur pour le suivi du dossier et l’accompagnement du groupe avant, pendant et après le séjour."],
];

function siteRoot(site) {
  return String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`).replace(/\/$/, "");
}

function cityName(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

function CardGrid({ items, columns = 3 }) {
  return (
    <div className="public-site-card-grid" data-columns={columns}>
      {items.map(([title, text]) => (
        <article className="public-site-card public-site-feature-card" key={title}>
          <h3>{title}</h3>
          <p>{text}</p>
        </article>
      ))}
    </div>
  );
}

function JourneyGrid({ journeys, contactHref }) {
  return (
    <div className="public-site-card-grid" data-columns="3">
      {journeys.map((journey) => (
        <article className="public-site-card public-site-feature-card" key={`${journey.type}-${journey.title}`} style={{ overflow: "hidden", padding: 0 }}>
          <img src={journey.image} alt={`${journey.type} en groupe - ${journey.destination}`} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }} />
          <div style={{ padding: "24px" }}>
            <p className="public-site-section-kicker">{journey.type} · {journey.destination}</p>
            <h3>{journey.title}</h3>
            <p><strong>{journey.duration}</strong></p>
            <p>{journey.text}</p>
            <Link href={contactHref}>Imaginer ce voyage avec mon agence</Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function GroupTravelPage({ site }) {
  const city = cityName(site);
  const root = siteRoot(site);
  const contactHref = `${root}/contact`;
  const hero = {
    id: "group-travel-hero",
    type: "hero",
    jsonContent: {
      eyebrow: "Voyages en groupe",
      title: "Voyager ensemble, avec un projet qui vous ressemble",
      text: city
        ? `Depuis ${city}, notre équipe imagine et organise votre voyage de groupe de A à Z : transport, hébergement, programme et accompagnement.`
        : "Notre équipe imagine et organise votre voyage de groupe de A à Z : transport, hébergement, programme et accompagnement.",
      backgroundImage: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=2400&q=85",
      backgroundPosition: "center 48%",
      overlayOpacity: 68,
      primaryCta: { label: "Construire mon voyage de groupe", href: "contact" },
      secondaryCta: { label: "Découvrir nos inspirations", href: "#inspirations-groupe" },
    },
  };

  return (
    <main className="public-site-group-travel">
      <HeroV2Renderer section={hero} site={site} page={{ slug: "voyages-en-groupe", title: "Voyages en groupe" }} />

      <section className="public-site-section public-site-features">
        <div className="public-site-container">
          <p className="public-site-section-kicker">Votre groupe, votre voyage</p>
          <h2>Un projet collectif, une organisation sur mesure</h2>
          <p className="public-site-section-intro">Un voyage de groupe ne se résume pas à réserver plusieurs places. Votre agence fait coïncider les envies, le budget, le rythme, les transports et les prestations pour construire un voyage cohérent pour tous.</p>
          <CardGrid items={GROUP_TYPES} columns={4} />
        </div>
      </section>

      <section id="inspirations-groupe" className="public-site-section public-site-features">
        <div className="public-site-container">
          <p className="public-site-section-kicker">Quelques idées pour partir ensemble</p>
          <h2>Des voyages à imaginer, puis à faire vôtres</h2>
          <p className="public-site-section-intro">Ces inspirations ne sont pas un catalogue figé. Elles montrent différentes façons de voyager en groupe. Destination, durée, étapes, hébergements, visites et services peuvent être retravaillés avec votre conseiller selon votre projet.</p>
          <JourneyGrid journeys={GROUP_JOURNEYS} contactHref={contactHref} />
        </div>
      </section>

      <section className="public-site-section public-site-features">
        <div className="public-site-container">
          <p className="public-site-section-kicker">Notre accompagnement</p>
          <h2>De la première idée jusqu’au retour</h2>
          <p className="public-site-section-intro">Vous gardez un interlocuteur de proximité et une vision claire du dossier pendant toute l’organisation.</p>
          <div className="public-site-card-grid" data-columns="4">
            {STEPS.map(([number, title, text]) => (
              <article className="public-site-card public-site-feature-card" key={number}>
                <p className="public-site-section-kicker">Étape {number}</p>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="public-site-section public-site-features">
        <div className="public-site-container">
          <p className="public-site-section-kicker">Pourquoi passer par votre agence ?</p>
          <h2>Un seul interlocuteur pour faire voyager tout le monde</h2>
          <CardGrid items={[
            ["Conseil personnalisé", "Le projet est construit selon le profil réel du groupe, et non à partir d’une formule imposée."],
            ["Organisation centralisée", "Transport, hébergement, prestations et programme sont réunis dans un même dossier pour simplifier la coordination."],
            ["Budget maîtrisé", "Nous recherchons une combinaison de prestations cohérente avec l’enveloppe et les priorités définies ensemble."],
            ["Suivi humain", "Votre conseiller connaît le dossier et reste votre point de contact tout au long de l’organisation."],
          ]} columns={4} />
        </div>
      </section>

      <section className="public-site-section public-site-page-heading">
        <div className="public-site-container public-site-prose">
          <p className="public-site-eyebrow">Parlons de votre groupe</p>
          <h2>Vous avez une destination, une idée… ou simplement une date ?</h2>
          <p>Indiquez-nous le nombre approximatif de participants, la période, la durée envisagée et votre budget. Notre équipe vous aidera à transformer ces premiers éléments en un véritable projet de voyage.</p>
          <div className="public-site-related-links">
            <Link href={contactHref}>{city ? `Présenter mon projet à l’agence de ${city}` : "Présenter mon projet de groupe"}</Link>
            <Link href={`${root}/destinations`}>Explorer toutes nos destinations</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export { GROUP_JOURNEYS, cityName, siteRoot };
