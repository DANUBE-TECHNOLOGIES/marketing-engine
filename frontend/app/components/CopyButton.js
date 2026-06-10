"use client";

export default function CopyButton({ text }) {
  async function copyText() {
    await navigator.clipboard.writeText(text);
    alert("Post copié !");
  }

  return (
    <button
      onClick={copyText}
      className="text-sm bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-700"
    >
      Copier
    </button>
  );
}
