import "../indexation.css";
import RolloutPageClient from "./RolloutPageClient";

export const metadata = {
  title: "Déploiement indexation | Marketing Engine",
  robots: {
    index: false,
    follow: false,
  },
};

export default function IndexationRolloutPage() {
  return <RolloutPageClient />;
}
