import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  pageHref,
  pageSlug,
  uniquePublishedNavigation,
} from "../PublicSiteHeader";
import {
  resolvePublicCtaHref,
} from "./ctaLinks";

function publishedContactPage(site) {
  return uniquePublishedNavigation(site).find((page) => pageSlug(page) === "contact") || null;
}

function resolvedAppointmentCta(content, site, contactPage) {
  const structured = content.primaryCta || null;
  const label = structured?.label || content.primaryButton || null;
  if (!label) return null;

  const explicitHref = String(structured?.href || "").trim();
  if (!explicitHref && !contactPage) return null;

  const href = explicitHref
    ? resolvePublicCtaHref(site, explicitHref, "")
    : pageHref(site.slug, contactPage);

  return href ? { label, href } : null;
}

export default function AppointmentRenderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const contactPage = publishedContactPage(site);
  const kicker = content.eyebrow || content.kicker || null;
  const title = getSectionTitle(section, null);
  const text = content.text || content.description || null;
  const cta = resolvedAppointmentCta(content, site, contactPage);

  if (!kicker && !title && !text && !cta) return null;

  return (
    <section className="public-site-section public-site-appointment">
      <div className="public-site-container public-site-appointment-inner">
        <div>
          {kicker ? (
            <p className="public-site-section-kicker">
              {kicker}
            </p>
          ) : null}

          {title ? <h2>{title}</h2> : null}
          {text ? <p>{text}</p> : null}
        </div>

        {cta ? (
          <a
            className="public-site-button"
            href={cta.href}
          >
            {cta.label}
          </a>
        ) : null}
      </div>
    </section>
  );
}

export { publishedContactPage, resolvedAppointmentCta };
