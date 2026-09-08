import { resolvedTargetCities } from "../../lib/seo/local-area-config";
import { absoluteUrl } from "../../lib/seo/site-url";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function unique(values) {
  const result = [];
  const seen = new Set();

  for (const value of values) {
    const text = clean(value);
    if (!text) continue;
    const key = text.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }

  return result;
}

export function agencyReferenceFacts(site) {
  const agency = site?.agency || site || {};
  const name = clean(site?.name || agency?.name);
  const city = clean(agency?.city || site?.city);
  const streetAddress = clean(agency?.address || site?.address);
  const postalCode = clean(agency?.postalCode || site?.postalCode);
  const phone = clean(agency?.phone || site?.phone);
  const email = clean(agency?.email || site?.email);
  const areas = unique([
    city,
    ...resolvedTargetCities(site, { limit: 6 }),
  ]);

  return {
    name,
    city,
    streetAddress,
    postalCode,
    phone,
    email,
    areas,
  };
}

export default function PublicAgencyReferenceFacts({ site }) {
  const facts = agencyReferenceFacts(site);
  const hasAddress = Boolean(facts.streetAddress && facts.postalCode && facts.city);
  const hasReferenceFact = Boolean(
    facts.name && (hasAddress || facts.phone || facts.email || facts.areas.length)
  );

  if (!hasReferenceFact) return null;

  const entityId = `${absoluteUrl(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`)}#travel-agency`;

  return (
    <section
      className="public-site-section public-site-agency-reference-facts"
      aria-labelledby="agency-reference-facts-title"
      data-geo-reference="canonical-agency"
      itemScope
      itemType="https://schema.org/TravelAgency"
      itemID={entityId}
    >
      <div className="public-site-container public-site-prose">
        <p className="public-site-eyebrow">Informations de référence</p>
        <h2 id="agency-reference-facts-title">Repères sur {facts.name}</h2>
        <dl>
          <div>
            <dt>Agence</dt>
            <dd itemProp="name">{facts.name}</dd>
          </div>

          {hasAddress ? (
            <div>
              <dt>Adresse</dt>
              <dd itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                <span itemProp="streetAddress">{facts.streetAddress}</span>{" "}
                <span itemProp="postalCode">{facts.postalCode}</span>{" "}
                <span itemProp="addressLocality">{facts.city}</span>
                <meta itemProp="addressCountry" content="FR" />
              </dd>
            </div>
          ) : facts.city ? (
            <div>
              <dt>Implantation</dt>
              <dd>{facts.city}</dd>
            </div>
          ) : null}

          {facts.phone ? (
            <div>
              <dt>Téléphone</dt>
              <dd><a itemProp="telephone" href={`tel:${facts.phone.replace(/\s+/g, "")}`}>{facts.phone}</a></dd>
            </div>
          ) : null}

          {facts.email ? (
            <div>
              <dt>E-mail</dt>
              <dd><a itemProp="email" href={`mailto:${facts.email}`}>{facts.email}</a></dd>
            </div>
          ) : null}

          {facts.areas.length ? (
            <div>
              <dt>Zone de proximité présentée sur ce mini-site</dt>
              <dd>
                {facts.areas.map((area, index) => (
                  <span key={area} itemProp="areaServed" itemScope itemType="https://schema.org/City">
                    <span itemProp="name">{area}</span>{index < facts.areas.length - 1 ? ", " : ""}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </section>
  );
}
