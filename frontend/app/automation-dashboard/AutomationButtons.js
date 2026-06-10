"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AutomationButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function runDaily() {
    setLoading(true);

    const res = await fetch("/api/automation/daily-run", {
      method: "POST"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur automation");
      setLoading(false);
      return;
    }

    const failed = (data.steps || []).filter((s) => !s.ok).length;

    alert(
      failed
        ? `Automation terminée avec ${failed} erreur(s)`
        : "Automation quotidienne exécutée avec succès"
    );

    router.refresh();
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 mb-6">
      <button
        disabled={loading}
        onClick={runDaily}
        className="px-4 py-2 rounded-xl bg-blue-100 disabled:opacity-40"
      >
        Lancer l’automatisation quotidienne
      </button>
    </div>
  );
}
