"use client";

import { useState } from "react";

export default function GooglePostActions({ id, content }) {
  const [msg, setMsg] = useState("");

  async function copy() {
    await navigator.clipboard.writeText(content);
    setMsg("Post copié ✅");
  }

  async function setStatus(status) {
    const res = await fetch(`/api/google-posts/${id}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });

    if (res.ok) {
      setMsg("Statut mis à jour ✅");
      setTimeout(() => window.location.reload(), 700);
    } else {
      setMsg("Erreur");
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button onClick={copy} className="bg-gray-900 text-white px-4 py-2 rounded-lg">
        Copier
      </button>

      <button onClick={() => setStatus("planned")} className="bg-blue-700 text-white px-4 py-2 rounded-lg">
        Planifié
      </button>

      <button onClick={() => setStatus("published")} className="bg-green-700 text-white px-4 py-2 rounded-lg">
        Publié
      </button>

      {msg && <p className="w-full text-sm font-semibold">{msg}</p>}
    </div>
  );
}
