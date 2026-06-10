"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SeoActionsButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);

    const res = await fetch("/api/seo-actions/generate", {
      method: "POST"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur");
      setLoading(false);
      return;
    }

    alert(`${data.created || 0} action(s) créée(s), ${data.existing || 0} déjà existante(s)`);
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
        Générer les actions SEO
      </button>
    </div>
  );
}
