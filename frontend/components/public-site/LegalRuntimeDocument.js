function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

export function legalRuntimeParagraphs(value) {
  const source = String(value || "");
  if (!source.trim()) return [];

  return decodeHtmlEntities(
    source
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<\s*br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|section|article)\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " ")
  )
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function value(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function lines(items) {
  return items.filter(Boolean);
}

function LegalCard({ icon, title, children }) {
  return (
    <article className="public-site-legal-card">
      <div className="public-site-legal-card-heading">
        <span className="public-site-legal-card-icon" aria-hidden="true">{icon}</span>
        <h2>{title}</h2>
      </div>
      <div className="public-site-legal-card-copy">{children}</div>
    </article>
  );
}

export default function LegalRuntimeDocument({ title, html, legalProfile }) {
  const documentPayload = html && typeof html === "object" && !Array.isArray(html) ? html : null;
  const documentHtml = documentPayload ? documentPayload.html : html;
  const profileSource = documentPayload?.legalProfile || legalProfile;
  const paragraphs = legalRuntimeParagraphs(documentHtml);
  const profile = profileSource && typeof profileSource === "object" ? profileSource : {};
  const legalName = value(profile.legalName);
  const office = value(profile.registeredOffice);
  const capital = value(profile.shareCapital);
  const registration = value(profile.registrationNumber);
  const vat = value(profile.vatNumber);
  const director = value(profile.publicationDirector);
  const host = value(profile.hostingProvider);
  const privacyEmail = value(profile.privacyContactEmail);

  const structured = [legalName, office, capital, registration, vat, director, host, privacyEmail].some(Boolean);

  return (
    <section className="public-site-legal-document" data-legal-source="runtime" data-legal-layout={structured ? "structured" : "legacy"}>
      <div className="public-site-container">
        <header className="public-site-legal-heading">
          <h1>{title}</h1>
          <span aria-hidden="true" />
        </header>

        {structured ? (
          <div className="public-site-legal-grid">
            <LegalCard icon="01" title="Éditeur du site">
              {lines([legalName, office, capital && `Capital social : ${capital}`]).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </LegalCard>

            <LegalCard icon="02" title="Immatriculation">
              {lines([
                registration && `Immatriculation / RCS : ${registration}`,
                vat && `TVA intracommunautaire : ${vat}`,
              ]).map((item) => (
                <p key={item}>{item}</p>
              ))}
            </LegalCard>

            <LegalCard icon="03" title="Direction de la publication">
              {director ? <p>{director}</p> : <p>Information à compléter.</p>}
              {privacyEmail ? <p>Contact : {privacyEmail}</p> : null}
            </LegalCard>

            <LegalCard icon="04" title="Hébergement">
              {host ? <p>{host}</p> : <p>Information à compléter.</p>}
            </LegalCard>
          </div>
        ) : null}

        {paragraphs.length ? (
          <details className="public-site-legal-disclosure">
            <summary>
              <span className="public-site-legal-card-icon" aria-hidden="true">+</span>
              <span className="public-site-legal-disclosure-copy">
                <strong>Informations juridiques complémentaires</strong>
                <span>Garanties, immatriculations, crédits photographiques et autres précisions légales.</span>
              </span>
              <span className="public-site-legal-disclosure-chevron" aria-hidden="true">⌄</span>
            </summary>

            <div className="public-site-legal-disclosure-content">
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
