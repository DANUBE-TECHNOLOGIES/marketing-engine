"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CitationAutomationButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function call(path) {
    setLoading(true);

    const res = await fetch(`/api/citations/${path}`, {
      method: "POST"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur");
      setLoading(false);
      return;
    }

    alert("Opération effectuée");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 mb-6 flex gap-3 flex-wrap">
      <button
        disabled={loading}
        onClick={() => call("prepare-automation")}
        className="px-4 py-2 rounded-xl bg-blue-100 disabled:opacity-40"
      >
        Préparer automatiquement
      </button>
    </div>
  );
}
