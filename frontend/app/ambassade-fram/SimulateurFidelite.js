"use client";
import { useState } from "react";
import { simulateFramLoyalty } from "../../lib/ambassade-fram/loyalty.mjs";

export default function SimulateurFidelite() {
  const [euros, setEuros] = useState("0");
  const amount = Number(euros);
  const valid = euros.trim() !== "" && Number.isFinite(amount) && amount >= 0 && amount <= 100000000;
  const result = valid ? simulateFramLoyalty(amount) : null;
  return (
    <section aria-labelledby="fram-simulation">
      <h2 id="fram-simulation">Simulateur indicatif de points</h2>
      <label htmlFor="fram-euros">Montant cumulé éligible en euros</label>
      <input id="fram-euros" type="number" min="0" max="100000000" step="0.01" value={euros}
        onChange={event => setEuros(event.target.value)} />
      {result ? (
        <p role="status">{result.points} points estimés. Palier atteint : {result.discountPercent} %.
          {result.nextTier ? ` Prochain palier : ${result.nextTier.points} points.` : ""}</p>
      ) : <p role="alert">Saisissez un montant positif valide.</p>}
      <p>Simulation non contractuelle. Les dépenses Plein Vent ne sont pas éligibles. Les conditions d’utilisation des remises sont à confirmer auprès de FRAM ou de votre agence.</p>
    </section>
  );
}
