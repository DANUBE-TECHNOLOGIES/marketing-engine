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

export default function LegalRuntimeDocument({ title, html }) {
  const paragraphs = legalRuntimeParagraphs(html);
  if (!paragraphs.length) return null;

  return (
    <section className="public-site-legal-document" data-legal-source="runtime">
      <div className="public-site-container">
        <header className="public-site-legal-heading">
          <h1>{title}</h1>
          <span aria-hidden="true" />
        </header>

        <div className="public-site-legal-card">
          <div className="public-site-legal-card-copy">
            {paragraphs.map((paragraph, index) => (
              <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
