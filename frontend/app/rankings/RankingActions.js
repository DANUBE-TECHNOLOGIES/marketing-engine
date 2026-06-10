"use client";

import { useState } from "react";

export default function RankingActions({ keywordId }) {
  const [message, setMessage] = useState("");

  async function launchCheck() {
    setMessage("Lancement du check...");

    const res = await fetch(`/api/rankings/${keywordId}/check`, {
      method: "POST"
    });

    const data = await res.json();

    if (res.ok) {
      setMessage(`Tâche créée ✅`);
    } else {
      setMessage(`Erreur : ${data.error || "inconnue"}`);
    }
  }

  async function fetchResult() {
    setMessage("Récupération du résultat...");

    const res = await fetch(`/api/rankings/${keywordId}/fetch-result`, {
      method: "POST"
    });

    const data = await res.json();

    if (res.ok) {
      setMessage(
        data.found
          ? `Position enregistrée : ${data.position} ✅`
          : "Non trouvé dans les résultats"
      );

      setTimeout(() => window.location.reload(), 800);
    } else {
      setMessage(`Erreur : ${data.error || "inconnue"}`);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={launchCheck}
          className="bg-blue-700 text-white px-3 py-2 rounded-lg"
        >
          Vérifier
        </button>

        <button
          type="button"
          onClick={fetchResult}
          className="bg-gray-900 text-white px-3 py-2 rounded-lg"
        >
          Résultat
        </button>
      </div>

      {message && <p className="text-xs text-gray-600">{message}</p>}
    </div>
  );
}
