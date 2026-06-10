"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GooglePostBulkActions() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run(path) {
    setLoading(true);

    const res = await fetch(`/api/google-posts/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: path === "publish-queue"
        ? JSON.stringify({ max: 10 })
        : JSON.stringify({})
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
        onClick={() => run("queue-approved")}
        className="px-4 py-2 rounded-xl bg-orange-100 disabled:opacity-40"
      >
        Mettre les posts approuvés en file
      </button>

      <button
        disabled={loading}
        onClick={() => run("publish-queue")}
        className="px-4 py-2 rounded-xl bg-green-100 disabled:opacity-40"
      >
        Publier la file maintenant
      </button>
    </div>
  );
}
