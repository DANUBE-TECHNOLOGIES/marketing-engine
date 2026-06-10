import MainLayout from "../components/MainLayout";
import TopPriorities from "../components/TopPriorities";

async function getDashboard(){
  try{
    const res = await fetch("http://backend:4000/dashboard-direction-v3", {
      cache:"no-store"
    });

    return await res.json();
  }catch{
    return {
      totalAgencies:0,
      seo:{leader:0,renforcement:0,offensive:0,critique:0},
      activity:{postsPublished30:0,reviewsReceived30:0,openActions:0},
      alerts:{total:0,high:0,medium:0,items:[]},
      rows:[]
    };
  }
}

function Card({label,value}) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

function Badge({children}) {
  return (
    <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold">
      {children}
    </span>
  );
}

export default async function Page(){

  const data = await getDashboard();
  const rows = data.rows || [];
  const alerts = data.alerts?.items || [];

  return (
    <MainLayout
      title="Dashboard Direction"
      subtitle="Cockpit quotidien du réseau Mondescale"
    >

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card label="Agences" value={data.totalAgencies} />
        <Card label="Posts publiés 30j" value={data.activity.postsPublished30} />
        <Card label="Avis obtenus 30j" value={data.activity.reviewsReceived30} />
        <Card label="Actions ouvertes" value={data.activity.openActions} />
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-green-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Leader</div>
          <div className="text-3xl font-bold">{data.seo.leader}</div>
        </div>

        <div className="bg-yellow-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Renforcement</div>
          <div className="text-3xl font-bold">{data.seo.renforcement}</div>
        </div>

        <div className="bg-orange-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Offensive</div>
          <div className="text-3xl font-bold">{data.seo.offensive}</div>
        </div>

        <div className="bg-red-50 rounded-2xl shadow p-5">
          <div className="text-sm text-gray-500">Critique</div>
          <div className="text-3xl font-bold">{data.seo.critique}</div>
        </div>
      </div>

      <TopPriorities />

<div className="bg-white rounded-2xl shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">
          Alertes prioritaires
        </h2>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <Card label="Total alertes" value={data.alerts.total} />
          <Card label="Priorité haute" value={data.alerts.high} />
          <Card label="Priorité moyenne" value={data.alerts.medium} />
        </div>

        <div className="space-y-3">
          {alerts.slice(0,8).map((alert,index)=>(
            <div
              key={`${alert.agencyId}-${alert.type}-${index}`}
              className={`rounded-xl p-4 ${
                alert.priority === "high" ? "bg-red-50" : "bg-yellow-50"
              }`}
            >
              <div className="font-bold">
                {alert.city} — {alert.agencyName}
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {alert.message}
              </div>
            </div>
          ))}

          {alerts.length === 0 && (
            <div className="text-gray-500">
              Aucune alerte prioritaire.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">
          État du réseau
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-3">Agence</th>
                <th>Ville</th>
                <th>SEO</th>
                <th>Position</th>
                <th>Posts 30j</th>
                <th>Avis 30j</th>
                <th>Actions</th>
                <th>Google</th>
                <th>Priorité</th>
              </tr>
            </thead>

            <tbody>
              {rows.map(row=>(
                <tr key={row.agencyId} className="border-b">
                  <td className="py-3 font-semibold">
                    {row.agencyName}
                  </td>

                  <td>{row.city}</td>

                  <td>
                    <Badge>{row.seoLevel}</Badge>
                  </td>

                  <td>
                    {row.averagePosition ? "#" + row.averagePosition : "-"}
                  </td>

                  <td>{row.posts30}</td>

                  <td>{row.reviews30}</td>

                  <td>{row.openActions}</td>

                  <td>{row.googleReady ? "OK" : "Incomplet"}</td>

                  <td>
                    <Badge>{row.priority}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </MainLayout>
  );
}
