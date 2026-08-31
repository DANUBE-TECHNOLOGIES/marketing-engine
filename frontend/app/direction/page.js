import MainLayout from "../components/MainLayout";
import Link from "next/link";

async function getJson(url){

try{

const r =
await fetch(
url,
{cache:"no-store"}
);

if(!r.ok){

return[];

}

return r.json();

}catch{

return[];

}

}


export default async function Page(){

const network =
await getJson(
"http://backend:4000/network-score"
);

const notifications =
await getJson(
"http://backend:4000/notifications"
);

const agencies =
await getJson(
"http://backend:4000/reviews/agencies-summary"
);

const leadAnalytics =
await getJson(
"http://backend:4000/api/leads/analytics?days=30"
);

const leadSummary = leadAnalytics?.summary || {};


return(

<MainLayout

title="Direction réseau"

subtitle="Cockpit SAS Danube"

>


<div
className="
grid
grid-cols-1
xl:grid-cols-4
gap-6">


{/* LEADS */}

<div
className="
bg-white
rounded-2xl
shadow
p-6">

<div className="flex items-center justify-between gap-3 mb-4">
<h2 className="font-bold">📥 Demandes clients</h2>
<Link href="/leads" className="text-sm font-semibold text-[#073653] hover:underline">Ouvrir</Link>
</div>

<div className="grid grid-cols-2 gap-3">
<div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-slate-500">30 jours</div><div className="text-2xl font-bold">{leadSummary.periodTotal || 0}</div></div>
<div className="rounded-xl bg-sky-50 p-3"><div className="text-xs text-slate-500">Nouveaux</div><div className="text-2xl font-bold">{leadSummary.new || 0}</div></div>
<div className="rounded-xl bg-emerald-50 p-3"><div className="text-xs text-slate-500">Conversion</div><div className="text-2xl font-bold">{leadSummary.conversionRate || 0}%</div></div>
<div className="rounded-xl bg-amber-50 p-3"><div className="text-xs text-slate-500">Délai contact</div><div className="text-2xl font-bold">{leadSummary.avgContactHours == null ? "—" : `${leadSummary.avgContactHours}h`}</div></div>
</div>

</div>


{/* ALERTES AGENCES */}

<div
className="
bg-white
rounded-2xl
shadow
p-6">

<h2
className="
font-bold
mb-4">

⚠ Agences à surveiller

</h2>


{

agencies
.slice(0,5)

.map(a=>(

<div

key={a.agency}

className={`
mb-3
p-3
rounded-xl

${

a.total>=5

?

"bg-red-50"

:

a.total>=2

?

"bg-orange-50"

:

"bg-white"

}

`}>

<div>

<strong>

{a.agency}

</strong>

</div>


<div>

{a.total}

 avis

</div>


<div>

Urgents :

{a.urgent}

</div>

</div>

))

}


</div>



{/* NOTIFICATIONS */}

<div
className="
bg-white
rounded-2xl
shadow
p-6">

<h2
className="
font-bold
mb-4">

🔔 Notifications

</h2>


{

notifications

.slice(0,5)

.map(n=>(

<div

key={n.id}

className="
mb-3
bg-slate-50
rounded
p-3">

<div>

<strong>

{n.title}

</strong>

</div>

<div>

{n.message}

</div>

</div>

))

}

</div>



{/* CLASSEMENT */}

<div
className="
bg-white
rounded-2xl
shadow
p-6">

<h2
className="
font-bold
mb-4">

🏆 Réseau

</h2>


{

network

.slice(0,5)

.map((a,i)=>(

<div

key={i}

className="
flex
justify-between
border-b
py-2">

<div>

#{i+1}

{" "}

{a.agency}

</div>

<div>

{a.score}

</div>

</div>

))

}

</div>



</div>

</MainLayout>

)

}
