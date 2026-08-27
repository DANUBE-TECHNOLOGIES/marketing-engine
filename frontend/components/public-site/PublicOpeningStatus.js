import { getPublicHours } from "../../lib/public-hours-api";

export default async function PublicOpeningStatus({ siteSlug }) {
  const hours = await getPublicHours(siteSlug).catch(() => null);
  const status = hours?.status;

  if (!status) return null;

  return (
    <span
      className={[
        "public-site-opening-status",
        status.isOpen ? "is-open" : "is-closed",
      ].join(" ")}
    >
      <i />
      {status.label}
    </span>
  );
}
