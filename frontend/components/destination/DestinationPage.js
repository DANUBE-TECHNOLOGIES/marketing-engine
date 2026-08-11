import Link from "next/link";
import JsonLd from "../JsonLd";
import {
  buildBreadcrumbSchema,
  buildDestinationSchema,
  buildTravelAgencySchema,
} from "../../lib/seo/json-ld";
import styles from "./DestinationPage.module.css";

function paragraphs(content) {
  if (!content || typeof content !== "object") return [];
  if (Array.isArray(content.paragraphs)) return content.paragraphs.filter(Boolean);
  const text = content.text || content.body || content.content || null;
  return text ? [text] : [];
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

  const destinationSchema = buildDestinationSchema(data);
  const agencySchema = buildTravelAgencySchema(site);
  const breadcrumbSchema = buildBreadcrumbSchema([
    {
      name: "Accueil",
      path: site.basePath,
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
          <p className={styles["de-kicker"]}>
            {[d.country, d.region, d.type].filter(Boolean).join(" · ")}
          </p>

          <h1>Voyage à {d.name}</h1>

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

          <Link href={data.quotePath}>
            Demander mon devis personnalisé
          </Link>
        </div>
      </section>
    </div>
  );
}
