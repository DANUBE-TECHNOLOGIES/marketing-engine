function sectionContent(section) {
  return (
    section.jsonContent ||
    section.content ||
    {}
  );
}

function TextSection({ section }) {
  const content = sectionContent(section);

  return (
    <section className="public-site-section">
      {section.title ? <h2>{section.title}</h2> : null}

      {content.heading ? (
        <h2>{content.heading}</h2>
      ) : null}

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

  return (
    <section className="public-site-hero">
      <div className="public-site-container">
        <p className="public-site-eyebrow">
          Agence de voyages
        </p>

        <h1>
          {content.title ||
            section.title ||
            site.name}
        </h1>

        <p className="public-site-hero-text">
          {content.subtitle ||
            content.description ||
            site.agency?.description ||
            "Votre agence vous accompagne dans la création de vos plus beaux voyages."}
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
              Appeler l’agence
            </a>
          ) : null}

          <a
            className="public-site-button public-site-button-secondary"
            href={`/sites/${site.slug}/contact`}
          >
            Nous contacter
          </a>
        </div>
      </div>
    </section>
  );
}

function CardsSection({ section }) {
  const content = sectionContent(section);
  const items =
    content.items ||
    content.cards ||
    content.services ||
    [];

  return (
    <section className="public-site-section">
      <div className="public-site-container">
        {section.title ? <h2>{section.title}</h2> : null}

        <div className="public-site-card-grid">
          {items.map((item, index) => (
            <article
              className="public-site-card"
              key={item.id || item.title || index}
            >
              <h3>{item.title || item.name}</h3>

              {item.description ? (
                <p>{item.description}</p>
              ) : null}

              {item.text ? <p>{item.text}</p> : null}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection({ section, site }) {
  const content = sectionContent(section);
  const agency = site.agency || {};

  return (
    <section className="public-site-section public-site-contact">
      <div className="public-site-container">
        <h2>
          {section.title ||
            content.title ||
            "Contactez votre agence"}
        </h2>

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
                <a href={`tel:${agency.phone}`}>
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

          {content.text ? <p>{content.text}</p> : null}
        </div>
      </div>
    </section>
  );
}

export default function PublicSiteSections({
  page,
  site,
}) {
  const sections = page.sections || [];

  return sections.map((section) => {
    const type = String(
      section.type || section.key || ""
    ).toLowerCase();

    if (type.includes("hero")) {
      return (
        <HeroSection
          key={section.id}
          section={section}
          site={site}
        />
      );
    }

    if (
      type.includes("cards") ||
      type.includes("services") ||
      type.includes("team") ||
      type.includes("engagement")
    ) {
      return (
        <CardsSection
          key={section.id}
          section={section}
        />
      );
    }

    if (
      type.includes("contact") ||
      type.includes("agency-info")
    ) {
      return (
        <ContactSection
          key={section.id}
          section={section}
          site={site}
        />
      );
    }

    return (
      <div
        className="public-site-container"
        key={section.id}
      >
        <TextSection section={section} />
      </div>
    );
  });
}
