function sectionContent(section) {
  const content =
    section?.jsonContent ||
    section?.content ||
    {};

  return content &&
    typeof content === "object" &&
    !Array.isArray(content)
    ? content
    : {};
}

function sectionType(section) {
  return String(
    section?.sectionType ||
    section?.type ||
    section?.key ||
    ""
  )
    .trim()
    .toLowerCase();
}

function sectionTitle(section, content) {
  return (
    content.title ||
    content.heading ||
    section.title ||
    null
  );
}

function TextSection({ section }) {
  const content = sectionContent(section);
  const title = sectionTitle(section, content);

  return (
    <section className="public-site-section">
      {title ? <h2>{title}</h2> : null}

      {content.text ? <p>{content.text}</p> : null}

      {content.description ? (
        <p>{content.description}</p>
      ) : null}

      {Array.isArray(content.paragraphs)
        ? content.paragraphs.map(
            (paragraph, index) => (
              <p key={index}>{paragraph}</p>
            )
          )
        : null}
    </section>
  );
}

function HeroSection({ section, site }) {
  const content = sectionContent(section);

  const title =
    content.title ||
    content.heading ||
    section.title ||
    site.name;

  const subtitle =
    content.subtitle ||
    content.text ||
    content.description ||
    site.agency?.description ||
    "Votre agence vous accompagne dans la création de vos plus beaux voyages.";

  return (
    <section className="public-site-hero">
      <div className="public-site-container">
        <p className="public-site-eyebrow">
          Agence de voyages
        </p>

        <h1>{title}</h1>

        <p className="public-site-hero-text">
          {subtitle}
        </p>

        <div className="public-site-hero-actions">
          {site.agency?.phone ? (
            <a
              className="public-site-button"
              href={`tel:${site.agency.phone.replace(
                /\s+/g,
                ""
              )}`}
            >
              {content.primaryButton ||
                "Appeler l’agence"}
            </a>
          ) : null}

          <a
            className="public-site-button public-site-button-secondary"
            href={`/sites/${site.slug}/contact`}
          >
            {content.secondaryButton ||
              "Nous contacter"}
          </a>
        </div>
      </div>
    </section>
  );
}

function CardsSection({ section }) {
  const content = sectionContent(section);
  const title = sectionTitle(section, content);

  const items =
    content.items ||
    content.cards ||
    content.services ||
    content.members ||
    [];

  return (
    <section className="public-site-section">
      <div className="public-site-container">
        {title ? <h2>{title}</h2> : null}

        {content.text ? <p>{content.text}</p> : null}

        {items.length ? (
          <div className="public-site-card-grid">
            {items.map((item, index) => (
              <article
                className="public-site-card"
                key={
                  item.id ||
                  item.title ||
                  item.name ||
                  index
                }
              >
                <h3>
                  {item.title ||
                    item.name ||
                    item.label}
                </h3>

                {item.description ? (
                  <p>{item.description}</p>
                ) : null}

                {item.text ? (
                  <p>{item.text}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="public-site-card-grid">
            <article className="public-site-card">
              <h3>{title || "Notre expertise"}</h3>
              <p>
                {content.description ||
                  content.text ||
                  "Découvrez prochainement le contenu de cette section."}
              </p>
            </article>
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewsSection({ section }) {
  const content = sectionContent(section);
  const title =
    sectionTitle(section, content) ||
    "Les avis de nos clients";

  const reviews =
    content.reviews ||
    content.items ||
    [];

  return (
    <section className="public-site-section public-site-reviews">
      <div className="public-site-container">
        <p className="public-site-review-rating">
          ★★★★★
        </p>

        <h2>{title}</h2>

        {content.text ? <p>{content.text}</p> : null}

        {reviews.length ? (
          <div className="public-site-card-grid">
            {reviews.map((review, index) => (
              <article
                className="public-site-card"
                key={review.id || index}
              >
                <p>
                  {review.comment ||
                    review.text ||
                    review.content}
                </p>

                {review.author ? (
                  <strong>{review.author}</strong>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p>
            Les derniers avis Google de l’agence
            seront bientôt affichés ici.
          </p>
        )}
      </div>
    </section>
  );
}

function ContactSection({ section, site }) {
  const content = sectionContent(section);
  const agency = site.agency || {};

  const title =
    sectionTitle(section, content) ||
    "Contactez votre agence";

  return (
    <section className="public-site-section public-site-contact">
      <div className="public-site-container">
        <h2>{title}</h2>

        <div className="public-site-contact-grid">
          <div>
            {agency.address ? (
              <p>
                <strong>Adresse</strong>
                <br />
                {agency.address}
                <br />
                {agency.postalCode} {agency.city}
              </p>
            ) : null}

            {agency.phone ? (
              <p>
                <strong>Téléphone</strong>
                <br />
                <a
                  href={`tel:${agency.phone.replace(
                    /\s+/g,
                    ""
                  )}`}
                >
                  {agency.phone}
                </a>
              </p>
            ) : null}

            {agency.email ? (
              <p>
                <strong>E-mail</strong>
                <br />
                <a href={`mailto:${agency.email}`}>
                  {agency.email}
                </a>
              </p>
            ) : null}
          </div>

          <div>
            {content.text ? (
              <p>{content.text}</p>
            ) : null}

            {content.description ? (
              <p>{content.description}</p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MapSection({ section, site }) {
  const content = sectionContent(section);
  const agency = site.agency || {};

  const query = encodeURIComponent(
    [
      agency.name || site.name,
      agency.address,
      agency.postalCode,
      agency.city,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return (
    <section className="public-site-section">
      <div className="public-site-container">
        <h2>
          {sectionTitle(section, content) ||
            "Venir à l’agence"}
        </h2>

        <div className="public-site-map-frame">
          <iframe
            title={`Carte ${site.name}`}
            src={`https://www.google.com/maps?q=${query}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}

function CtaSection({ section, site }) {
  const content = sectionContent(section);

  return (
    <section className="public-site-section public-site-cta">
      <div className="public-site-container">
        <h2>
          {sectionTitle(section, content) ||
            "Préparons votre prochain voyage"}
        </h2>

        {content.text ? <p>{content.text}</p> : null}

        <div className="public-site-hero-actions">
          <a
            className="public-site-button"
            href={`/sites/${site.slug}/contact`}
          >
            {content.primaryButton ||
              "Demander un devis"}
          </a>
        </div>
      </div>
    </section>
  );
}

export default function PublicSiteSections({
  page,
  site,
}) {
  const sections = Array.isArray(page?.sections)
    ? page.sections
    : [];

  return sections
    .filter((section) => section.status !== "hidden")
    .map((section, index) => {
      const type = sectionType(section);

      const key =
        section.id ||
        `${type || "section"}-${index}`;

      if (type.includes("hero")) {
        return (
          <HeroSection
            key={key}
            section={section}
            site={site}
          />
        );
      }

      if (type.includes("review")) {
        return (
          <ReviewsSection
            key={key}
            section={section}
          />
        );
      }

      if (
        type.includes("services") ||
        type.includes("cards") ||
        type.includes("team") ||
        type.includes("equipe") ||
        type.includes("destination") ||
        type.includes("engagement")
      ) {
        return (
          <CardsSection
            key={key}
            section={section}
          />
        );
      }

      if (type.includes("map")) {
        return (
          <MapSection
            key={key}
            section={section}
            site={site}
          />
        );
      }

      if (
        type.includes("contact") ||
        type.includes("agency-info") ||
        type.includes("horaires")
      ) {
        return (
          <ContactSection
            key={key}
            section={section}
            site={site}
          />
        );
      }

      if (type.includes("cta")) {
        return (
          <CtaSection
            key={key}
            section={section}
            site={site}
          />
        );
      }

      return (
        <div
          className="public-site-container"
          key={key}
        >
          <TextSection section={section} />
        </div>
      );
    });
}
