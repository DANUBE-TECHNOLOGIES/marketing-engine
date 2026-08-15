import Link from "next/link";
import "./indexation.css";
import IndexationCockpitClient from "./IndexationCockpitClient";

export const metadata = {
  title: "Indexation | Marketing Engine",
  robots: { index: false, follow: false },
};

export default function IndexationPage() {
  return (
    <>
      <div className="indexation-page-tools">
        <Link href="/indexation/local-seo">Couverture SEO locale</Link>
        <Link href="/indexation/performance">Performance Search Console</Link>
        <Link href="/indexation/status">Suivre les sitemaps</Link>
        <Link href="/indexation/rollout">Préparer une vague d’indexation contrôlée</Link>
      </div>
      <IndexationCockpitClient />
    </>
  );
}
