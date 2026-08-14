import "./indexation.css";
import IndexationCockpitClient from "./IndexationCockpitClient";

export const metadata = {
  title: "Indexation | Marketing Engine",
  robots: {
    index: false,
    follow: false,
  },
};

export default function IndexationPage() {
  return (
    <>
      <div className="indexation-page-tools">
        <a href="/indexation/rollout">Préparer une vague d’indexation contrôlée</a>
      </div>
      <IndexationCockpitClient />
    </>
  );
}
