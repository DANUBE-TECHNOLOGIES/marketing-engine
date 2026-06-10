"use client";

export default function PostStatusButton({ validationKey, action, label }) {
  async function updateStatus() {
    const res = await fetch(`http://localhost:4000/google-post-validation/${validationKey}/${action}`, {
      method: "POST"
    });

    if (!res.ok) {
      alert("Erreur lors de la mise à jour du statut");
      return;
    }

    window.location.reload();
  }

  return (
    <button
      onClick={updateStatus}
      className="text-sm bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-700"
    >
      {label}
    </button>
  );
}
