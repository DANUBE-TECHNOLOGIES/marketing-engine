import MainLayout from "../components/MainLayout";
import AutomationLogsButtons from "./AutomationLogsButtons";

async function getLogs() {
  try {
    const res = await fetch("http://backend:4000/automation/logs", {
      cache: "no-store"
    });

    return await res.json();
  } catch {
    return {
      exists: false,
      lines: [],
      raw: ""
    };
  }
}

export default async function Page() {
  const logs = await getLogs();

  return (
    <MainLayout
      title="Logs automatisation"
      subtitle="Suivi du cron quotidien Local Engine"
    >
      <AutomationLogsButtons />

      <div className="bg-white rounded-2xl shadow p-5 mb-6">
        <div className="text-sm text-gray-500">Fichier log</div>
        <div className="font-mono text-sm mt-2">{logs.path || "Aucun fichier détecté"}</div>
        <div className="text-sm text-gray-500 mt-2">
          Lignes affichées : {(logs.lines || []).length}
        </div>
      </div>

      <div className="bg-black text-green-300 rounded-2xl shadow p-6 overflow-x-auto">
        <pre className="text-xs whitespace-pre-wrap">
          {logs.raw || "Aucun log disponible."}
        </pre>
      </div>
    </MainLayout>
  );
}
