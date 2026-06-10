"use client";

export default function NotificationActions({ id, link }) {
  async function closeNotification() {
    await fetch(`/api/notifications/${id}/close`, {
      method: "POST"
    });

    window.location.reload();
  }

  return (
    <div className="flex gap-2">
      {link && (
        <a href={link} className="bg-gray-900 text-white px-3 py-2 rounded-lg">
          Ouvrir
        </a>
      )}

      <button
        onClick={closeNotification}
        className="bg-gray-200 text-gray-900 px-3 py-2 rounded-lg"
      >
        Fermer
      </button>
    </div>
  );
}
