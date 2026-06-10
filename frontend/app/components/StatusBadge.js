export default function StatusBadge({ status }) {
  const labels = {
    todo: "À vérifier",
    missing: "Absent",
    to_correct: "À corriger",
    pending: "En attente",
    ok: "Correct",
    ignored: "Ignoré"
  };

  const styles = {
    todo: "bg-gray-100 text-gray-800",
    missing: "bg-red-100 text-red-800",
    to_correct: "bg-orange-100 text-orange-800",
    pending: "bg-blue-100 text-blue-800",
    ok: "bg-green-100 text-green-800",
    ignored: "bg-gray-200 text-gray-600"
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.todo}`}>
      {labels[status] || status}
    </span>
  );
}
