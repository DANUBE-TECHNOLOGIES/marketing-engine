import Link from "next/link";

import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function initials(value) {
  return String(value || "Équipe")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function localTeamTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `L’équipe de votre agence de voyages à ${city}`
    : "L’équipe de votre agence de voyages";
}

function localTeamIntro(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Rencontrez les conseillers de votre agence à ${city}, disponibles pour vous accompagner dans la préparation de vos séjours, circuits, croisières et voyages sur mesure.`
    : "Rencontrez nos conseillers voyage, disponibles pour vous accompagner dans la préparation de vos séjours, circuits, croisières et voyages sur mesure.";
}

function siteHref(site, slug) {
  const root = String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`)
    .replace(/\/$/, "");
  return `${root}/${slug}`;
}

export default function TeamRenderer({ section, site }) {
  const content = getSectionContent(section);
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
              const name = member.name || member.title || "Conseiller voyage";
              const role = member.role || member.jobTitle || member.subtitle || "Conseiller voyage";
              const image = member.image || member.imageUrl || member.photo || member.photoUrl || null;

              return (
                <article className="public-site-team-card" key={member.id || member.email || name || index}>
                  <div className="public-site-team-portrait">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={member.imageAlt || `Portrait de ${name}`} loading="lazy" />
                    ) : (
                      <span>{initials(name)}</span>
                    )}
                  </div>
                  <div className="public-site-team-copy">
                    <h3>{name}</h3>
                    <p className="public-site-team-role">{role}</p>
                    {member.description || member.bio ? (
                      <p>{member.description || member.bio}</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        <div className="public-site-related-links" aria-label="Préparer votre voyage avec notre équipe">
          <Link href={siteHref(site, "services")}>Découvrir les services de l’agence</Link>
          <Link href={siteHref(site, "destinations")}>Explorer nos destinations</Link>
          <Link href={siteHref(site, "contact")}>Contacter un conseiller voyage</Link>
        </div>
      </div>
    </section>
  );
}

export {
  localTeamIntro,
  localTeamTitle,
  siteHref,
};
