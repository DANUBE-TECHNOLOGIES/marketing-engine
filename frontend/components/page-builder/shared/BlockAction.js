import Link from "next/link";
import { isExternalHref } from "./blockUtils";

export default function BlockAction({ action, secondary = false, className = "" }) {
  if (!action?.href || !action?.label) return null;

  const classes = ["as-btn", secondary ? "as-btn-secondary" : "", className]
    .filter(Boolean)
    .join(" ");

  if (isExternalHref(action.href)) {
    return <a className={classes} href={action.href}>{action.label}</a>;
  }

  return <Link className={classes} href={action.href}>{action.label}</Link>;
}
