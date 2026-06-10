"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReviewNetworkButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generateActions() {
    setLoading(true);

    const res = await fetch("/api/review-network/generate-actions", {
      method: "POST"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur");
      setLoading(false);
      return;
    }

    alert(`${data.created || 0} action(s) avis créée(s)`);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 mb-6">
      <button
        disabled={loading}
        onClick={generateActions}
        className="px-4 py-2 rounded-xl bg-blue-100 disabled:opacity-40"
      >
        Générer les actions avis
      </button>
    </div>
  );
}
