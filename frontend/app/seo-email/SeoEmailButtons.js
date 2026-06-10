"use client";

import { useState } from "react";

export default function SeoEmailButtons() {
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);

    const res = await fetch("/api/seo-email/send-daily", {
      method: "POST"
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert(data.error || "Erreur envoi email");
      setLoading(false);
      return;
    }

    if (data.sent) {
      alert("Email SEO envoyé.");
    } else {
      alert(`Mode preview : ${data.reason || "email non envoyé"}`);
    }

    setLoading(false);
  }

  return (
    <div className="bg-white rounded-2xl shadow p-5 mb-6">
      <button
        onClick={send}
        disabled={loading}
        className="px-4 py-2 rounded-xl bg-blue-100 disabled:opacity-40"
      >
        Envoyer / tester le rapport SEO
      </button>
    </div>
  );
}
