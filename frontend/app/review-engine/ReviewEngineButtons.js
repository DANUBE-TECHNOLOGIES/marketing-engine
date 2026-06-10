"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviewEngineButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);

    const res = await fetch("/api/review-engine/generate-requests", {
      method: "POST"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur");
      setLoading(false);
      return;
    }

    alert(`${data.created || 0} demande(s) d'avis générée(s)`);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 mb-6">
      <button
        disabled={loading}
        onClick={generate}
        className="px-4 py-2 rounded-xl bg-blue-100 disabled:opacity-40"
      >
        Générer les demandes d’avis manquantes
      </button>
    </div>
  );
}
