"use client";

import { useState } from "react";

export default function ReviewRequestActions({ requestId, message, phone, channel }) {
  const [status, setStatus] = useState("");

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setStatus("Message copié ✅");
  }

  async function markSent() {
    const res = await fetch(`/api/review-requests/${requestId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status: "sent" })
    });

    if (res.ok) {
      setStatus("Marqué comme envoyé ✅");
    } else {
      setStatus("Erreur");
    }
  }

  const whatsappUrl =
    channel === "whatsapp" && phone
      ? `https://wa.me/33${phone.replace(/\D/g, "").replace(/^0/, "")}?text=${encodeURIComponent(message)}`
      : null;

  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <button
        onClick={copyMessage}
        className="bg-gray-900 text-white px-4 py-2 rounded-lg"
      >
        Copier le message
      </button>

      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="bg-green-700 text-white px-4 py-2 rounded-lg"
        >
          Ouvrir WhatsApp
        </a>
      )}

      <button
        onClick={markSent}
        className="bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Marquer envoyé
      </button>

      {status && <p className="w-full text-sm font-semibold">{status}</p>}
    </div>
  );
}
