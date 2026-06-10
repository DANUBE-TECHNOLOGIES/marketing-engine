export default function StatCard({ label, value, helper }) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {helper && <p className="text-xs text-gray-500 mt-2">{helper}</p>}
    </div>
  );
}
