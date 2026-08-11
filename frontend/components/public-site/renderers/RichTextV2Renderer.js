import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function textParagraphs(value) {
  return String(value || "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeAlignment(value) {
  return ["left", "center", "right"].includes(value) ? value : "left";
}

function normalizeLabel(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*:\s*$/, "")
    .trim()
    .toLowerCase();
}

const LEGAL_HEADINGS = [
  ["editeur du site", "Éditeur du site", "▤"],
  ["informations legales", "Informations légales", "▧"],
  ["hebergement", "Hébergement", "◇"],
  ["nos garanties", "Nos garanties", "✓"],
  ["garanties", "Garanties", "✓"],
  ["photos", "Crédits photos", "◉"],
  ["donnees personnelles", "Données personnelles", "▣"],
  ["politique de confidentialite", "Politique de confidentialité", "▣"],
  ["responsable du traitement", "Responsable du traitement", "▤"],
  ["donnees collectees", "Données collectées", "≡"],
  ["collecte des donnees", "Collecte des données", "≡"],
  ["finalites", "Finalités du traitement", "◎"],
  ["base legale", "Base légale", "§"],
  ["destinataires", "Destinataires", "↗"],
  ["duree de conservation", "Durée de conservation", "◷"],
  ["vos droits", "Vos droits", "✓"],
  ["droits des personnes", "Vos droits", "✓"],
  ["cookies", "Cookies", "◌"],
  ["securite", "Sécurité", "◇"],
  ["transferts de donnees", "Transferts de données", "↗"],
  ["contact", "Contact", "@"],
];

function legalHeading(value) {
  const normalized = normalizeLabel(value);
  const found = LEGAL_HEADINGS.find(([key]) => normalized === key);
  if (found) return { title: found[1], icon: found[2] };

  const raw = String(value || "").trim();
  if (raw.endsWith(":") && raw.length <= 64) {
    return { title: raw.replace(/\s*:\s*$/, ""), icon: "•" };
  }
  return null;
}

function isLegalPage(page) {
  const slug = normalizeLabel(page?.slug).replace(/_/g, "-");
  const title = normalizeLabel(page?.title);
  return ["mentions-legales", "confidentialite", "politique-de-confidentialite", "privacy"].includes(slug)
    || title.includes("mentions legales")
    || title.includes("confidentialite");
}

function buildLegalGroups(values) {
  const groups = [];
  let current = null;
  for (const value of values) {
    const heading = legalHeading(value);
    if (heading) {
      current = { ...heading, paragraphs: [] };
      groups.push(current);
      continue;
    }
    if (!current) {
      current = { title: "Informations", icon: "i", paragraphs: [] };
      groups.push(current);
    }
    current.paragraphs.push(value);
  }
  return groups.filter((group) => group.paragraphs.length > 0);
}

function isPersonalDataGroup(group) {
  const label = normalizeLabel(group?.title);
  return label === "donnees personnelles" || label === "politique de confidentialite";
}

function LegalCard({ group, index }) {
  return (
    <article className="public-site-legal-card" key={`${group.title}-${index}`}>
      <div className="public-site-legal-card-heading">
        <span className="public-site-legal-card-icon" aria-hidden="true">{group.icon}</span>
        <h2>{group.title}</h2>
      </div>
      <div className="public-site-legal-card-copy">
        {group.paragraphs.map((paragraph, paragraphIndex) => (
          <p key={`${index}-${paragraphIndex}`}>{paragraph}</p>
        ))}
      </div>
    </article>
  );
}

function PersonalDataDisclosure({ group }) {
  return (
    <details className="public-site-legal-disclosure">
      <summary>
        <span className="public-site-legal-card-icon" aria-hidden="true">{group.icon}</span>
        <span className="public-site-legal-disclosure-copy">
          <strong>{group.title}</strong>
          <span>Vos droits, nos engagements et la gestion des données.</span>
        </span>
        <span className="public-site-legal-disclosure-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="public-site-legal-disclosure-content">
        {group.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
    </details>
  );
}

function LegalDocument({ section, page, content, paragraphs }) {
  const title = getSectionTitle(section, null) || page?.title || "Informations légales";
  const values = [...textParagraphs(content.text), ...textParagraphs(content.description), ...paragraphs];
  const groups = buildLegalGroups(values);
  const compactGroups = groups.filter((group) => !isPersonalDataGroup(group));
  const personalDataGroup = groups.find(isPersonalDataGroup);

  return (
    <section className="public-site-section public-site-legal-document">
      <div className="public-site-container">
        <header className="public-site-legal-heading">
          <h1>{title}</h1>
          <span aria-hidden="true" />
        </header>

        <div className="public-site-legal-grid">
          {compactGroups.map((group, index) => <LegalCard group={group} index={index} key={`${group.title}-${index}`} />)}
        </div>

        {personalDataGroup ? <PersonalDataDisclosure group={personalDataGroup} /> : null}
      </div>
    </section>
  );
}

export default function RichTextV2Renderer({ section, page }) {
  const content = getSectionContent(section);
  const alignment = normalizeAlignment(content.alignment);
  const paragraphs = textParagraphs(content.html);

  if (isLegalPage(page)) {
    return <LegalDocument section={section} page={page} content={content} paragraphs={paragraphs} />;
  }

  return (
    <section className="public-site-section public-site-rich-text">
      <div className="public-site-container public-site-prose" style={{ textAlign: alignment }}>
        {getSectionTitle(section, null) ? (
          <h2 style={alignment === "left" ? undefined : { marginInline: alignment === "center" ? "auto" : "0 0 22px auto" }}>
            {getSectionTitle(section, null)}
          </h2>
        ) : null}
        {content.text ? <p>{content.text}</p> : null}
        {content.description ? <p>{content.description}</p> : null}
        {paragraphs.map((paragraph, index) => <p key={`paragraph-${index}`}>{paragraph}</p>)}
      </div>
    </section>
  );
}
