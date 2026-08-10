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
        <h2>{getSectionTitle(section, "Une équipe passionnée")}</h2>
        {content.text || content.description ? (
          <p className="public-site-section-intro">
            {content.text || content.description}
          </p>
        ) : null}

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
      </div>
    </section>
  );
}
