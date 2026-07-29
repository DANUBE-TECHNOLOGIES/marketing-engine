import Link from "next/link";
import JsonLd from "../JsonLd";
import {
  buildBreadcrumbSchema,
  buildDestinationSchema,
  buildTravelAgencySchema,
} from "../../lib/seo/json-ld";
import styles from "./DestinationPage.module.css";

export default function DestinationPage({ data }) {
  const { destination: d, site } = data;

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

  return (
    <div className={styles["de-page"]}>
      <JsonLd data={agencySchema} />
      <JsonLd data={destinationSchema} />
      <JsonLd data={breadcrumbSchema} />

      <header className={styles["de-nav"]}>
        <div className={styles["de-shell"]}>
          <Link href={site.basePath} className={styles["de-brand"]}>
            {site.name}
          </Link>

          <nav aria-label="Navigation principale">
            <Link href={site.basePath}>Accueil</Link>
            <Link
              href={`${site.basePath}/contact`}
              className={styles["de-nav-cta"]}
            >
              Demander un devis
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section
          className={styles["de-hero"]}
          style={{
            backgroundImage: `linear-gradient(90deg,rgba(9,25,37,.88),rgba(9,25,37,.28)),url("${d.heroImageUrl || ""}")`,
          }}
        >
          <div className={styles["de-shell"]}>
            <p className={styles["de-kicker"]}>
              {[d.country, d.type].filter(Boolean).join(" · ")}
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

        <section
          id="decouvrir"
          className={styles["de-content"]}
        >
          <div className={styles["de-shell"]}>
            {d.summary && <p>{d.summary}</p>}
          </div>
        </section>

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
      </main>
    </div>
  );
}
