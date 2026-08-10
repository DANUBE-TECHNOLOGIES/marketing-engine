import Link from "next/link";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function articleSections(content) {
  const body = asObject(content?.body);
  return Array.isArray(body.sections) ? body.sections : [];
}

function articleFaq(content) {
  const body = asObject(content?.body);
  return Array.isArray(body.faq) ? body.faq : [];
}

function articleImage(content) {
  const body = asObject(content?.body);
  const seo = asObject(content?.seo);
  const openGraph = asObject(seo.openGraph);
  const hero = asObject(body.hero);

  return (
    body.heroImageUrl ||
    body.heroImage ||
    body.imageUrl ||
    body.image ||
    hero.imageUrl ||
    hero.image ||
    openGraph.imageUrl ||
    openGraph.image ||
    null
  );
}

function sectionText(section) {
  return (
    section?.text ||
    section?.content ||
    section?.body ||
    section?.description ||
    ""
  );
}

export default function InspirationArticle({ content, site }) {
  const body = asObject(content?.body);
  const sections = articleSections(content);
  const faq = articleFaq(content);
  const image = articleImage(content);
  const homeHref = `/agence/${encodeURIComponent(site.slug)}`;

  return (
    <article className="public-site-section">
      <div className="public-site-container public-site-prose">
        <p className="public-site-eyebrow">
          {body.category || body.theme || "Inspiration voyage"}
        </p>

        <h1>{content.title}</h1>

        {content.excerpt ? (
          <p className="public-site-section-intro">{content.excerpt}</p>
        ) : null}

        {image ? (
          <figure className="public-site-inspiration-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={content.title || "Inspiration voyage"} />
          </figure>
        ) : null}

        {body.introduction ? <p>{body.introduction}</p> : null}

        {sections.map((section, index) => (
          <section key={section.id || section.slug || index}>
            {section.title ? <h2>{section.title}</h2> : null}
            {sectionText(section) ? <p>{sectionText(section)}</p> : null}
          </section>
        ))}

        {faq.length ? (
          <section>
            <h2>Questions fréquentes</h2>
            <div className="public-site-faq-list">
              {faq.map((item, index) => (
                <details key={item.id || item.question || index}>
                  <summary>{item.question || item.title || "Question"}</summary>
                  <p>{item.answer || item.text || item.content || ""}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        <div className="public-site-hero-actions">
          <Link className="public-site-button" href={`${homeHref}/contact`}>
            Parler de ce voyage avec votre agence
          </Link>
          <Link className="public-site-button public-site-button-secondary" href={homeHref}>
            Retour à l’agence
          </Link>
        </div>
      </div>
    </article>
  );
}
