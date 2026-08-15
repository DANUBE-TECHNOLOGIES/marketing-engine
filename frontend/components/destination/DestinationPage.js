import Link from "next/link";
import JsonLd from "../JsonLd";
import {
  buildBreadcrumbSchema,
  buildDestinationSchema,
  buildTravelAgencySchema,
} from "../../lib/seo/json-ld";
import { resolvedTargetCities } from "../../lib/seo/local-area-config";
import styles from "./DestinationPage.module.css";

function paragraphs(content) {
  if (!content || typeof content !== "object") return [];
  if (Array.isArray(content.paragraphs)) return content.paragraphs.filter(Boolean);
  const text = content.text || content.body || content.content || null;
  return text ? [text] : [];
}

function joinCities(values) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const COMMERCIAL_PAGE_INTENTS = Object.freeze([
  { key: "cruise", label: "croisières", terms: ["croisiere", "croisieres"] },
  { key: "circuit", label: "circuits", terms: ["circuit", "circuits"] },
  { key: "custom", label: "voyages sur mesure", terms: ["voyage-sur-mesure", "voyages-sur-mesure", "sur-mesure"] },
  { key: "stay", label: "séjours", terms: ["sejour", "sejours", "club", "clubs"] },
  { key: "ticketing", label: "billetterie et vols", terms: ["billetterie", "billetterie-vols", "vol", "vols"] },
]);

function commercialPageLinks(site) {
  const root = String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`).replace(/\/$/, "");
  const pages = Array.isArray(site?.pages) ? site.pages : [];
  const seen = new Set();
  const result = [];

  for (const page of pages) {
    const slug = String(page?.slug || "").trim();
    if (!slug) continue;
    const source = normalize(`${slug} ${page?.title || ""}`);
    const intent = COMMERCIAL_PAGE_INTENTS.find((candidate) =>
      candidate.terms.some((term) => source.includes(term))
    );
    if (!intent || seen.has(intent.key)) continue;
    seen.add(intent.key);
    result.push({
      key: intent.key,
      label: intent.label,
      href: `${root}/${slug}`,
    });
  }

  return result;
}

function SectionContent({ section }) {
  const content = section?.content && typeof section.content === "object"
    ? section.content
    : {};
  const type = String(section?.type || "editorial").toLowerCase();

  if (type === "cards") {
    const items = Array.isArray(content.items) ? content.items : [];
    return (
      <section className={styles["de-section"]}>
        <div className={styles["de-shell"]}>
          {section.title ? <h2>{section.title}</h2> : null}
          <div className={styles["de-cards"]}>
            {items.map((item, index) => (
              <article key={`${section.id || section.key || "cards"}-${index}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {item.title ? <h3>{item.title}</h3> : null}
                {item.text ? <p>{item.text}</p> : null}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (type === "feature") {
    return (
      <section className={styles["de-feature"]}>
        <div className={styles["de-shell"]}>
          {content.eyebrow ? <p className={styles["de-kicker"]}>{content.eyebrow}</p> : null}
          {section.title ? <h2>{section.title}</h2> : null}
          {content.text ? <p>{content.text}</p> : null}
        </div>
      </section>
    );
  }

  if (type === "timeline") {
    const items = Array.isArray(content.items) ? content.items : [];
    return (
      <section className={`${styles["de-section"]} ${styles["de-soft"]}`}>
        <div className={styles["de-shell"]}>
          {section.title ? <h2>{section.title}</h2> : null}
          <div className={styles["de-timeline"]}>
            {items.map((item, index) => (
              <article key={`${section.id || section.key || "timeline"}-${index}`}>
                <strong>{item.day || `Étape ${index + 1}`}</strong>
                <div>
                  {item.title ? <h3>{item.title}</h3> : null}
                  {item.text ? <p>{item.text}</p> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (type === "tips") {
    const items = Array.isArray(content.items) ? content.items : [];
    return (
      <section className={styles["de-section"]}>
        <div className={`${styles["de-shell"]} ${styles["de-two"]}`}>
          <div>
            <p className={styles["de-kicker"]}>Conseils personnalisés</p>
            {section.title ? <h2>{section.title}</h2> : null}
          </div>
          <ul>
            {items.map((item, index) => <li key={`${section.id || section.key || "tips"}-${index}`}>{item}</li>)}
          </ul>
        </div>
      </section>
    );
  }

  const text = paragraphs(content);
  if (!text.length && !section.title) return null;

  return (
    <section className={styles["de-section"]}>
      <div className={styles["de-shell"]}>
        {section.title ? <h2>{section.title}</h2> : null}
        <div className={styles["de-prose"]}>
          {text.map((paragraph, index) => (
            <p key={`${section.id || section.key || "editorial"}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

function faqSchema(faqs) {
  if (!Array.isArray(faqs) || !faqs.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs
      .filter((faq) => faq?.question && faq?.answer)
      .map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
  };
}

export default function DestinationPage({ data }) {
  const { destination: d, site } = data;
  const sections = Array.isArray(d.sections) ? d.sections : [];
  const faqs = Array.isArray(d.faqs) ? d.faqs : [];
  const siteRoot = site.basePath || `/agence/${encodeURIComponent(site.slug)}`;
  const root = siteRoot.replace(/\/$/, "");
  const destinationsPath = `${root}/destinations`;
  const inspirationsPath = `${root}/inspiration`;
  const servicesPath = `${root}/services`;
  const contactPath = `${root}/contact`;
  const city = site?.agency?.city || null;
  const nearby = resolvedTargetCities(site, { limit: 4 });
  const commercialLinks = commercialPageLinks(site);
  const destinationHeading = city ? `Voyage à ${d.name} depuis ${city}` : `Voyage à ${d.name}`;

  const destinationSchema = buildDestinationSchema(data);
  const agencySchema = buildTravelAgencySchema(site);
  const breadcrumbSchema = buildBreadcrumbSchema([
    {
      name: "Accueil",
      path: siteRoot,
    },
    {
      name: "Destinations",
      path: destinationsPath,
    },
    {
      name: d.name,
      path: data.canonicalPath,
    },
  ]);
  const destinationFaqSchema = faqSchema(faqs);

  const facts = [
    ["Meilleure période", d.bestTime],
    ["Durée idéale", d.idealDuration],
    ["Langue", d.language],
    ["Monnaie", d.currency],
  ].filter(([, value]) => value);

  return (
    <div className={styles["de-page"]}>
      <JsonLd data={agencySchema} />
      <JsonLd data={destinationSchema} />
      <JsonLd data={breadcrumbSchema} />
      {destinationFaqSchema?.mainEntity?.length ? <JsonLd data={destinationFaqSchema} /> : null}

      <section
        className={styles["de-hero"]}
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(9,25,37,.88),rgba(9,25,37,.28)),url("${d.heroImageUrl || ""}")`,
        }}
      >
        <div className={styles["de-shell"]}>
          <nav aria-label="Fil d’Ariane">
            <Link href={siteRoot}>Accueil de {site.name}</Link>
            <span aria-hidden="true"> › </span>
            <Link href={destinationsPath}>Destinations</Link>
            <span aria-hidden="true"> › </span>
            <span>{d.name}</span>
          </nav>

          <p className={styles["de-kicker"]}>
            {[d.country, d.region, d.type].filter(Boolean).join(" · ")}
          </p>

          <h1>{destinationHeading}</h1>

          {d.tagline && <p>{d.tagline}</p>}

          <div className={styles["de-actions"]}>
            <Link href={data.quotePath}>
              Construire mon voyage
            </Link>

            <a href="#decouvrir">
              Découvrir {d.name}
            </a>
          </div>
        </div>
      </section>

      {facts.length ? (
        <section className={styles["de-facts"]} aria-label={`Informations pratiques sur ${d.name}`}>
          <div className={styles["de-shell"]}>
            {facts.map(([label, value]) => (
              <div key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section id="decouvrir" className={styles["de-intro"]}>
        <div className={styles["de-shell"]}>
          <p className={styles["de-kicker"]}>L’inspiration Mondescale</p>
          <h2>{d.tagline || `Découvrez ${d.name} autrement`}</h2>
          {city ? (
            <div className={styles["de-prose"]}>
              <p>
                Votre agence {site.name} à {city} vous accompagne pour préparer un voyage à {d.name}
                adapté à votre rythme, à vos envies et à votre budget.
              </p>
              {nearby.length ? (
                <p>
                  Nos conseillers accompagnent également les voyageurs de {joinCities(nearby)}
                  qui souhaitent construire leur séjour à {d.name} avec un interlocuteur local.
                </p>
              ) : null}
            </div>
          ) : null}
          {d.summary ? <div className={styles["de-prose"]}><p>{d.summary}</p></div> : null}
          {Array.isArray(d.highlights) && d.highlights.length ? (
            <div className={styles["de-pills"]}>
              {d.highlights.map((highlight) => <span key={highlight}>{highlight}</span>)}
            </div>
          ) : null}
        </div>
      </section>

      {sections.map((section) => (
        <SectionContent key={section.id || section.key} section={section} />
      ))}

      {faqs.length ? (
        <section className={styles["de-faq"]}>
          <div className={styles["de-shell"]}>
            <p className={styles["de-kicker"]}>Préparer votre voyage</p>
            <h2>Questions fréquentes sur {d.name}</h2>
            {faqs.map((faq, index) => (
              <details key={faq.id || `${faq.question}-${index}`}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles["de-final"]}>
        <div className={styles["de-shell"]}>
          <p className={styles["de-kicker"]}>
            Un voyage conçu pour vous
          </p>

          <h2>Prêt à découvrir {d.name} ?</h2>

          <p>
            Votre agence {site.name} construit un séjour adapté à
            vos envies, à votre rythme et à votre budget.
          </p>

          <div className={styles["de-actions"]}>
            <Link href={data.quotePath}>
              Demander mon devis personnalisé
            </Link>
            {commercialLinks.map((item) => (
              <Link key={item.key} href={item.href}>
                Découvrir nos {item.label} {city ? `à ${city}` : ""}
              </Link>
            ))}
            <Link href={servicesPath}>
              Découvrir nos services voyage
            </Link>
            <Link href={inspirationsPath}>
              Voir les conseils et inspirations voyage
            </Link>
            <Link href={contactPath}>
              Contacter {site.name}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export {
  COMMERCIAL_PAGE_INTENTS,
  commercialPageLinks,
};
