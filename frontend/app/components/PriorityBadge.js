export default function PriorityBadge({ priority }) {
  const styles = {
    Haute: "bg-red-100 text-red-800",
    Moyenne: "bg-orange-100 text-orange-800",
    Faible: "bg-green-100 text-green-800"
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[priority] || "bg-gray-100 text-gray-800"}`}>
      {priority}
    </span>
  );
}
