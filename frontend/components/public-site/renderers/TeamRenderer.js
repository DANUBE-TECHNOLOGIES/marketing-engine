import Link from "next/link";

import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function initials(value) {
  return String(value || "Équipe")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function localTeamTitle(site) {
  const city = clean(site?.agency?.city || site?.city);
  return city
    ? `L’équipe de votre agence de voyages à ${city}`
    : "L’équipe de votre agence de voyages";
}

function localTeamIntro(site) {
  const city = clean(site?.agency?.city || site?.city);
  return city
    ? `Rencontrez les conseillers de votre agence à ${city}, disponibles pour vous accompagner dans la préparation de vos séjours, circuits, croisières et voyages sur mesure.`
    : "Rencontrez nos conseillers voyage, disponibles pour vous accompagner dans la préparation de vos séjours, circuits, croisières et voyages sur mesure.";
}

function siteHref(site, slug) {
  const root = String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`)
    .replace(/\/$/, "");
  return `${root}/${slug}`;
}

function memberPresentation(member) {
  return clean(member.description || member.bio);
}

function assetUrl(value) {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value !== "object") return null;

  return clean(
    value.publicUrl ||
    value.url ||
    value.src ||
    value.path ||
    value.assetUrl ||
    value.fileUrl ||
    ""
  ) || null;
}

function memberImageUrl(member) {
  return (
    assetUrl(member.image) ||
    assetUrl(member.imageUrl) ||
    assetUrl(member.photo) ||
    assetUrl(member.photoUrl) ||
    assetUrl(member.portrait) ||
    assetUrl(member.portraitUrl) ||
    assetUrl(member.media) ||
    assetUrl(member.asset) ||
    null
  );
}

export default function TeamRenderer({ section, site }) {
  const content = getSectionContent(section);
  const city = clean(site?.agency?.city || site?.city);
  const members = [
    ...(Array.isArray(content.members) ? content.members : []),
    ...(Array.isArray(content.items) ? content.items : []),
    ...(Array.isArray(content.team) ? content.team : []),
  ].filter(Boolean);

  const uniqueMembers = members.filter((member, index, list) => {
    const key = String(member.id || member.email || member.name || member.title || index);
    return list.findIndex((candidate, candidateIndex) =>
      String(candidate.id || candidate.email || candidate.name || candidate.title || candidateIndex) === key
    ) === index;
  });

  if (!uniqueMembers.length && content.showWhenEmpty !== true) {
    return null;
  }

  return (
    <section className="public-site-section public-site-team">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Votre équipe</p>
        <h2>{getSectionTitle(section, localTeamTitle(site))}</h2>
        <p className="public-site-section-intro">
          {content.text || content.description || localTeamIntro(site)}
        </p>

        {uniqueMembers.length ? (
          <div className="public-site-team-grid">
            {uniqueMembers.map((member, index) => {
              const name = clean(member.name || member.title) || "Conseiller voyage";
              const role = clean(member.role || member.jobTitle || member.subtitle) || "Conseiller voyage";
              const image = memberImageUrl(member);
              const presentation = memberPresentation(member);

              return (
                <article className="public-site-team-card" key={member.id || member.email || name || index}>
                  <div className="public-site-team-portrait">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={member.imageAlt || member.photoAlt || `Portrait de ${name}`}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        width="640"
                        height="640"
                      />
                    ) : (
                      <span>{initials(name)}</span>
                    )}
                  </div>
                  <div className="public-site-team-copy">
                    <h3>{name}</h3>
                    <p className="public-site-team-role">
                      {city ? `${role} à ${city}` : role}
                    </p>
                    {presentation ? <p>{presentation}</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        <div
          className="public-site-related-links"
          aria-label={city ? `Préparer votre voyage avec l’équipe de ${city}` : "Préparer votre voyage avec notre équipe"}
        >
          <Link href={siteHref(site, "services")}>
            {city ? `Services de nos conseillers voyage à ${city}` : "Découvrir les services de l’agence"}
          </Link>
          <Link href={siteHref(site, "destinations")}>
            {city ? `Destinations conseillées par l’équipe de ${city}` : "Explorer nos destinations"}
          </Link>
          <Link href={siteHref(site, "contact")}>
            {city ? `Contacter un conseiller voyage à ${city}` : "Contacter un conseiller voyage"}
          </Link>
        </div>
      </div>
    </section>
  );
}

export {
  assetUrl,
  localTeamIntro,
  localTeamTitle,
  memberImageUrl,
  memberPresentation,
  siteHref,
};
