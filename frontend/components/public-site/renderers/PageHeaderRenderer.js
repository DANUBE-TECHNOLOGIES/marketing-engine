import { getSectionContent, getSectionTitle } from "./helpers";
import styles from "./PageHeaderRenderer.module.css";

function pageCity(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

export default function PageHeaderRenderer({ section, site, page }) {
  const content = getSectionContent(section);
  const title = String(page?.h1 || "").trim() || getSectionTitle(section, null) || content.title || page?.title || "";
  const introduction = content.introduction || content.text || content.subtitle || "";
  const city = pageCity(site);

  return (
    <section className={`public-site-section ${styles.section}`}>
      <div className={`public-site-container ${styles.inner}`}>
        <p className={styles.eyebrow}>{content.eyebrow || (city ? `Agence de voyages à ${city}` : "Agence de voyages")}</p>
        <h1>{title}</h1>
        {introduction ? <p className={styles.introduction}>{introduction}</p> : null}
      </div>
    </section>
  );
}
