import { FRAM_LOYALTY_THRESHOLDS } from "../../lib/ambassade-fram/loyalty.mjs";

export const metadata = {
  title: "Ambassade FRAM | Mondescale Voyages",
  description: "Fidélité, offres exclusives et accompagnement dans les agences Ambassade FRAM Mondescale Voyages.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main style={{maxWidth: 900, margin: "auto", padding: 32}}>
      <h1>Les avantages Ambassade FRAM</h1>
      <p>Dans les agences Mondescale Voyages éligibles, découvrez les avantages du programme Ambassade FRAM.</p>
      <h2>Carte de fidélité</h2>
      <p>Gratuite, valable cinq années civiles. Pour les séjours et circuits FRAM éligibles, 100 euros dépensés correspondent à un point. Plein Vent est exclu.</p>
      <ul>{FRAM_LOYALTY_THRESHOLDS.map(t => <li key={t.points}>{t.points} points : {t.percent} % de remise selon les conditions du programme.</li>)}</ul>
      <h2>Offres exclusives</h2>
      <p>Quatre offres Exclus Ambassade FRAM sont sélectionnées chaque mois, sous réserve de disponibilité et des conditions de vente. Des ventes flash peuvent également être proposées.</p>
      <p>Consultez votre agence pour confirmer les conditions et les offres en cours.</p>
      <small>Mondescale Voyages est un réseau indépendant. Ambassade FRAM ne signifie pas agence FRAM en propre.</small>
    </main>
  );
}
