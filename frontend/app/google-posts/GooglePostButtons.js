"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GooglePostButtons({
  postId,
  currentStatus,
  googlePostName
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function update(status) {
    setLoading(true);

    const res = await fetch(`/api/google-posts/${postId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      alert("Erreur lors de la mise à jour du post");
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  async function publishGoogle() {
    setLoading(true);

    const res = await fetch(`/api/google-posts/${postId}/publish-google`, {
      method: "POST"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur publication Google");
      setLoading(false);
      router.refresh();
      return;
    }

    if (data.alreadyPublished) {
      alert("Ce post est déjà publié sur Google.");
    } else {
      alert("Post publié sur Google Business Profile.");
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <div className="mt-4 flex gap-2 flex-wrap">
      <button
        disabled={loading || currentStatus === "draft" || Boolean(googlePostName)}
        onClick={() => update("draft")}
        className="px-3 py-2 rounded-xl bg-slate-100 disabled:opacity-40"
      >
        Brouillon
      </button>

      <button
        disabled={loading || currentStatus === "planned" || Boolean(googlePostName)}
        onClick={() => update("planned")}
        className="px-3 py-2 rounded-xl bg-orange-100 disabled:opacity-40"
      >
        Planifié
      </button>

      <button
        disabled={loading || Boolean(googlePostName)}
        onClick={publishGoogle}
        className="px-3 py-2 rounded-xl bg-green-100 disabled:opacity-40"
      >
        {googlePostName ? "Déjà publié" : "Publier sur Google"}
      </button>
    </div>
  );
}
