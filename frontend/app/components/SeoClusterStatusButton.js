"use client";

export default function SeoClusterStatusButton({ postKey, status, label }) {
  async function updateStatus() {
    const res = await fetch("http://localhost:4000/seo-cluster-calendar/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        key: postKey,
        status
      })
    });

    if (!res.ok) {
      alert("Erreur changement statut");
      return;
    }

    window.location.reload();
  }

  return (
    <button
      onClick={updateStatus}
      className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700"
    >
      {label}
    </button>
  );
}
