import Link from "next/link";
import { absoluteUrl } from "../../../lib/seo/site-url";
import { contextualJourneyItems } from "../PublicContextualJourney";
import { getSectionContent, getSectionTitle } from "./helpers";
import styles from "./TeamRenderer.module.css";

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
    ? `Retrouvez les conseillers présentés par votre agence de voyages à ${city} et les informations publiées sur leur rôle et leur parcours.`
    : "Retrouvez les conseillers présentés par votre agence et les informations publiées sur leur rôle et leur parcours.";
}

function siteRoot(site) {
  return String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`).replace(/\/$/, "");
}

function siteHref(site, slug) {
  return `${siteRoot(site)}/${slug}`;
}

function agencyEntityId(site) {
  return `${absoluteUrl(siteRoot(site))}#travel-agency`;
}

function memberEntityId(site, member, index) {
  const rawKey = clean(member?.id || member?.email || member?.name || member?.title || `member-${index + 1}`)
    .toLocaleLowerCase("fr-FR")
    .replace(/\s+/g, "-");
  return `${absoluteUrl(siteRoot(site))}#person-${encodeURIComponent(rawKey)}`;
}

function firstText(...values) {
  for (const value of values) {
    const resolved = clean(value);
    if (resolved) return resolved;
  }
  return "";
}

function normalizedList(...values) {
  for (const value of values) {
    if (Array.isArray(value)) {
      const items = value
        .map((item) => clean(typeof item === "object" ? item?.label || item?.name || item?.title : item))
        .filter(Boolean);
      if (items.length) return [...new Set(items)];
    }

    if (typeof value === "string") {
      const items = value
        .split(/[,;|]/)
        .map(clean)
        .filter(Boolean);
      if (items.length) return [...new Set(items)];
    }
  }
  return [];
}

function memberPresentation(member) {
  return firstText(member?.presentation, member?.description, member?.bio, member?.about);
}

function memberSpecialties(member) {
  return normalizedList(member?.specialties, member?.specialites, member?.expertise, member?.expertises);
}

function memberDestinations(member) {
  return normalizedList(
    member?.destinations,
    member?.favoriteDestinations,
    member?.favouriteDestinations,
    member?.destinationFavorites,
    member?.destinationsFavorites,
  );
}

function memberExperience(member) {
  const direct = firstText(member?.experience, member?.experienceLabel, member?.seniority);
  if (direct) return direct;

  const years = Number(member?.yearsExperience ?? member?.experienceYears);
  if (Number.isFinite(years) && years > 0) {
    return `${Math.trunc(years)} an${Math.trunc(years) > 1 ? "s" : ""} d’expérience`;
  }
  return "";
}

function assetUrl(value) {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (Array.isArray(value)) {
    for (const candidate of value) {
      const resolved = assetUrl(candidate);
      if (resolved) return resolved;
    }
    return null;
  }
  if (typeof value !== "object") return null;
  return assetUrl(
    value.publicUrl ||
      value.url ||
      value.src ||
      value.path ||
      value.href ||
      value.assetUrl ||
      value.fileUrl ||
      value.file ||
      value.asset ||
      null,
  );
}

function memberImage(member) {
  if (!member || typeof member !== "object") return null;
  const candidates = [
    member.image,
    member.imageUrl,
    member.photo,
    member.photoUrl,
    member.photoAsset,
    member.avatar,
    member.avatarUrl,
    member.portrait,
    member.portraitUrl,
    member.portraitAsset,
    member.media,
    member.asset,
    member.picture,
    member.pictureUrl,
    member.profileImage,
    member.profileImageUrl,
    member.profilePhoto,
    member.profilePhotoUrl,
  ];
  for (const candidate of candidates) {
    const resolved = assetUrl(candidate);
    if (resolved) return resolved;
  }
  return null;
}

function memberImageAlt(member, name) {
  return clean(
    member?.imageAlt ||
      member?.photoAlt ||
      member?.avatarAlt ||
      member?.media?.altText ||
      member?.media?.alt,
  ) || `Portrait de ${name}`;
}

function memberCollection(content, site) {
  const candidates = [
    content.members,
    content.items,
    content.team,
    content.teamMembers,
    site?.team,
    site?.teamMembers,
    site?.agency?.team,
    site?.agency?.teamMembers,
    site?.agency?.members,
  ];
  return candidates.flatMap((value) => (Array.isArray(value) ? value : [])).filter(Boolean);
}

function MemberFacts({ member }) {
  const experience = memberExperience(member);
  const specialties = memberSpecialties(member);
  const destinations = memberDestinations(member);
  if (!experience && !specialties.length && !destinations.length) return null;

  return (
    <div className={styles.facts}>
      {experience ? <p><strong>Expérience</strong><span>{experience}</span></p> : null}
      {specialties.length ? <p><strong>Spécialités</strong><span>{specialties.join(" · ")}</span></p> : null}
      {destinations.length ? <p><strong>Destinations</strong><span>{destinations.join(" · ")}</span></p> : null}
    </div>
  );
}

export default function TeamRenderer({ section, site, page }) {
  const content = getSectionContent(section);
  const city = clean(site?.agency?.city || site?.city);
  const members = memberCollection(content, site);
  const uniqueMembers = members.filter((member, index, list) => {
    const key = String(member.id || member.email || member.name || member.title || index);
    return list.findIndex((candidate, candidateIndex) => String(
      candidate.id || candidate.email || candidate.name || candidate.title || candidateIndex,
    ) === key) === index;
  });

  if (!uniqueMembers.length && content.showWhenEmpty !== true) return null;
  const singleMember = uniqueMembers.length === 1;
  const agencyId = agencyEntityId(site);
  const agencyName = clean(site?.name || site?.agency?.name) || "Mondescale Voyages";
  const navigationItems = contextualJourneyItems(site, page?.slug, 3);

  return (
    <section className={`public-site-section public-site-team ${styles.section}`} data-team-size={uniqueMembers.length}>
      <div className="public-site-container">
        <header className={styles.heading}>
          <div>
            <p className="public-site-section-kicker">Votre équipe</p>
            <h2>{getSectionTitle(section, localTeamTitle(site))}</h2>
          </div>
          <p className={styles.intro}>{content.text || content.description || localTeamIntro(site)}</p>
        </header>
        {uniqueMembers.length ? (
          <div className={`${styles.grid} ${singleMember ? styles.single : ""}`}>
            {uniqueMembers.map((member, index) => {
              const name = clean(member.name || member.title) || "Conseiller voyage";
              const role = clean(member.role || member.jobTitle || member.subtitle) || "Conseiller voyage";
              const image = memberImage(member);
              const presentation = memberPresentation(member);
              return (
                <article
                  className={styles.card}
                  key={member.id || member.email || name || index}
                  itemScope
                  itemType="https://schema.org/Person"
                  itemID={memberEntityId(site, member, index)}
                >
                  <span itemProp="worksFor" itemScope itemType="https://schema.org/TravelAgency" itemID={agencyId}>
                    <meta itemProp="name" content={agencyName} />
                  </span>
                  <div className={styles.portrait}>
                    {image ? (
                      <img itemProp="image" src={image} alt={memberImageAlt(member, name)} loading="lazy" decoding="async" fetchPriority="low" width="720" height="720" />
                    ) : <span>{initials(name)}</span>}
                  </div>
                  <div className={styles.copy}>
                    <h3 itemProp="name">{name}</h3>
                    <p className={styles.role}>{city ? <><span itemProp="jobTitle">{role}</span> à {city}</> : <span itemProp="jobTitle">{role}</span>}</p>
                    {presentation ? <p itemProp="description">{presentation}</p> : null}
                    <MemberFacts member={member} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
        {navigationItems.length ? (
          <nav className={styles.links} aria-label={city ? `Pages publiées par l’agence de ${city}` : "Pages publiées par notre agence"}>
            {navigationItems.map((item) => (
              <Link key={item.slug} href={item.href}>{item.title}</Link>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

export {
  agencyEntityId,
  assetUrl,
  firstText,
  localTeamIntro,
  localTeamTitle,
  memberCollection,
  memberDestinations,
  memberEntityId,
  memberExperience,
  memberImage,
  memberImageAlt,
  memberPresentation,
  memberSpecialties,
  normalizedList,
  siteHref,
};
