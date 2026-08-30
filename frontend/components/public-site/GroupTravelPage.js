import Link from "next/link";

import HeroV2Renderer from "./renderers/HeroV2Renderer";

const GROUP_TYPES = [
  ["Associations et clubs", "Culture, loisirs, sport ou passion commune : nous construisons un programme adapté au rythme et aux attentes de votre groupe."],
  ["CSE et collectivités", "Séjours, circuits et escapades pensés pour fédérer les participants, avec une organisation claire et un budget maîtrisé."],
  ["Familles et groupes d’amis", "Anniversaire, retrouvailles ou simple envie de partir ensemble : un voyage personnalisé sans multiplier les démarches."],
  ["Groupes scolaires et éducatifs", "Transport, hébergement et programme sont organisés autour du projet, de l’âge des participants et des contraintes d’encadrement."],
];

const FORMATS = [
  ["Séjours", "Une destination, un hébergement adapté au groupe et des prestations sélectionnées selon vos envies."],
  ["Circuits", "Un itinéraire construit étape par étape avec transports, visites, guides et hébergements coordonnés."],
  ["Croisières", "Cabines, acheminements et prestations regroupés pour profiter ensemble du voyage dès le départ."],
  ["Week-ends et escapades", "Quelques jours pour découvrir une ville, assister à un événement ou partager une expérience collective."],
  ["Voyages sur mesure", "Un projet conçu à partir d’une page blanche lorsque votre groupe, votre destination ou votre programme sort des standards."],
  ["Départs personnalisés", "Selon le projet, nous étudions les solutions de transport et les points de départ les plus cohérents pour votre groupe."],
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

export default function GroupTravelPage({ site }) {
  const city = cityName(site);
  const root = siteRoot(site);
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
      secondaryCta: { label: "Découvrir nos destinations", href: "destinations" },
    },
  };

  return (
    <main className="public-site-group-travel">
      <HeroV2Renderer section={hero} site={site} page={{ slug: "voyages-en-groupe", title: "Voyages en groupe" }} />

      <section className="public-site-section public-site-features">
        <div className="public-site-container">
          <p className="public-site-section-kicker">Votre groupe, votre voyage</p>
          <h2>Un projet collectif, une organisation sur mesure</h2>
          <p className="public-site-section-intro">Un voyage de groupe ne se résume pas à réserver plusieurs places. Il faut faire coïncider les envies, le budget, le rythme, les transports et les prestations. Votre agence centralise le projet et construit une solution cohérente pour l’ensemble des participants.</p>
          <CardGrid items={GROUP_TYPES} columns={4} />
        </div>
      </section>

      <section className="public-site-section public-site-features">
        <div className="public-site-container">
          <p className="public-site-section-kicker">Toutes les envies de groupe</p>
          <h2>Du week-end au grand circuit</h2>
          <p className="public-site-section-intro">Le format s’adapte à votre groupe : séjour détente, circuit de découverte, croisière, escapade ou création entièrement personnalisée.</p>
          <CardGrid items={FORMATS} columns={3} />
          <div className="public-site-related-links">
            <Link href={`${root}/destinations`}>Explorer nos destinations</Link>
            <Link href={`${root}/inspiration`}>Trouver des idées de voyage</Link>
          </div>
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
            <Link href={`${root}/contact`}>{city ? `Présenter mon projet à l’agence de ${city}` : "Présenter mon projet de groupe"}</Link>
            <Link href={`${root}/services`}>Découvrir tous nos services</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export { cityName, siteRoot };
