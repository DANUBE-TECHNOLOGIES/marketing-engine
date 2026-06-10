"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AutomationLogsButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function runNow() {
    setLoading(true);

    const res = await fetch("/api/automation/run-now", {
      method: "POST"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) {
      alert(data.error || "Erreur lors du lancement");
      setLoading(false);
      return;
    }

    alert("Automatisation lancée.");
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 mb-6">
      <button
        disabled={loading}
        onClick={runNow}
        className="px-4 py-2 rounded-xl bg-blue-100 disabled:opacity-40"
      >
        Lancer maintenant
      </button>
    </div>
  );
}
