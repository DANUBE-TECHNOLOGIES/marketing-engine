"use client";

export default function ReviewActionButton({ reviewId, action, label }) {
  async function execute() {
    const res = await fetch(`http://localhost:4000/reviews/${reviewId}/${action}`, {
      method: "POST"
    });

    if (!res.ok) {
      alert("Erreur action avis");
      return;
    }

    window.location.reload();
  }

  return (
    <button
      onClick={execute}
      className="text-sm bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-700"
    >
      {label}
    </button>
  );
}
