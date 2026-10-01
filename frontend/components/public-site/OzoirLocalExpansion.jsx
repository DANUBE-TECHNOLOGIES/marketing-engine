import Link from "next/link";
import {
  OZOIR_LOCAL_EXPANSION,
  isOzoirExpansionSite,
} from "../../lib/seo/ozoir-local-expansion";

export default function OzoirLocalExpansion({ site }) {
  if (!isOzoirExpansionSite(site)) return null;

  const data = OZOIR_LOCAL_EXPANSION;
  const basePath = site?.basePath || `/agence/${site.slug}`;

  return (
    <section
      className="public-section public-local-expansion"
      aria-labelledby="ozoir-local-expansion-title"
    >
      <div className="public-container">
        <header className="public-section-heading">
          <p className="public-eyebrow">Agence de proximité</p>
          <h2 id="ozoir-local-expansion-title">{data.heading}</h2>
          <p>{data.introduction}</p>
        </header>

        <div className="public-content-grid">
          <article>
            <h3>Votre projet de voyage, près de chez vous</h3>
            <p>{data.services}</p>
            <p>{data.fram}</p>
            <p>{data.remote}</p>
          </article>

          <article>
            <h3>Nous accompagnons les voyageurs des communes voisines</h3>

            {data.coreCities.map((city) => (
              <div key={city}>
                <h4>{city}</h4>
                <p>{data.cityCopy[city]}</p>
              </div>
            ))}
          </article>
        </div>

        <div className="public-content-grid">
          <article>
            <p className="public-eyebrow">{data.pontault.eyebrow}</p>
            <h3>{data.pontault.heading}</h3>
            <p>{data.pontault.introduction}</p>
            <p>{data.pontault.service}</p>
            <p>{data.pontault.truth}</p>
          </article>

          <article>
            <p className="public-eyebrow">{data.cruise.eyebrow}</p>
            <h3>{data.cruise.heading}</h3>
            <p>{data.cruise.introduction}</p>
            <p>{data.cruise.advice}</p>
            <p>{data.cruise.local}</p>
          </article>
        </div>

        <div className="public-local-expansion-actions">
          <p>{data.cta}</p>

          <div className="public-actions">
            {site?.agency?.phone ? (
              <a href={`tel:${String(site.agency.phone).replace(/\s+/g, "")}`}>
                Appeler l’agence
              </a>
            ) : null}

            <Link href={`${basePath}/contact`}>
              Contacter l’agence
            </Link>

            <Link href={`${basePath}/services`}>
              Découvrir nos services
            </Link>

            <Link href={`${basePath}/destinations`}>
              Préparer votre voyage
            </Link>
          </div>
        </div>

        <div className="public-local-expansion-faq">
          <h3>Questions fréquentes</h3>

          {data.faq.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
