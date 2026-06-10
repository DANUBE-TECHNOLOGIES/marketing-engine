"use client";

import { useState } from "react";

export default function ReviewReplyForm({ reviewId, rating, comment, agencyName, city }) {
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState("");

  async function generateAI() {
    setMessage("Génération...");

    const res = await fetch("/api/reviews/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        rating,
        comment,
        agencyName,
        city
      })
    });

    const data = await res.json();
    setReply(data.reply);
    setMessage("");
  }

  async function submitReply(e) {
    e.preventDefault();

    setMessage("Enregistrement...");

    const res = await fetch(`/api/reviews/${reviewId}/reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ reply })
    });

    if (res.ok) {
      setMessage("Réponse enregistrée ✅");
      setTimeout(() => window.location.reload(), 700);
    } else {
      setMessage("Erreur");
    }
  }

  return (
    <form onSubmit={submitReply} className="mt-5 space-y-3">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={generateAI}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Réponse intelligente
        </button>
      </div>

      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        className="w-full border rounded-lg p-3 min-h-28"
        placeholder="Votre réponse..."
      />

      <button className="bg-gray-900 text-white px-4 py-2 rounded-lg">
        Enregistrer
      </button>

      {message && <p className="text-sm font-semibold">{message}</p>}
    </form>
  );
}
