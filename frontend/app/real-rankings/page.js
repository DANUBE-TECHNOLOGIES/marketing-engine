import MainLayout from "../components/MainLayout";

async function getHistory(){

  try{

    const res =
      await fetch(
        "http://backend:4000/real-rankings/history",
        {
          cache:"no-store"
        }
      );

    return await res.json();

  }catch{

    return {
      total:0,
      latest:0,
      checks:[],
      latestChecks:[]
    };

  }

}

export default async function Page(){

  const data =
    await getHistory();

  const latest =
    data.latestChecks || [];

  const checks =
    data.checks || [];

  return(

<MainLayout
title="Rankings SEO réels"
subtitle="Positions Google Maps vérifiées via DataForSEO"
>

<div
className="
grid
grid-cols-3
gap-4
mb-8">

<div
className="
bg-white
rounded-2xl
shadow
p-5">

<div
className="
text-sm
text-gray-500">
Contrôles stockés
</div>

<div
className="
text-3xl
font-bold">
{data.total}
</div>

</div>


<div
className="
bg-white
rounded-2xl
shadow
p-5">

<div
className="
text-sm
text-gray-500">
Derniers suivis
</div>

<div
className="
text-3xl
font-bold">
{data.latest}
</div>

</div>


<div
className="
bg-white
rounded-2xl
shadow
p-5">

<div
className="
text-sm
text-gray-500">
Meilleure position récente
</div>

<div
className="
text-3xl
font-bold">

{
latest.length
?
"#" + Math.min(
...latest
.filter(r=>r.position)
.map(r=>r.position)
)
:
"-"
}

</div>

</div>

</div>


<div
className="
bg-white
rounded-2xl
shadow
p-6
mb-8">

<h2
className="
text-xl
font-bold
mb-4">
Dernières positions par agence / mot-clé
</h2>

<div className="overflow-x-auto">

<table className="w-full text-sm">

<thead>
<tr className="text-left border-b">
<th className="py-3">Agence</th>
<th>Ville</th>
<th>Mot-clé</th>
<th>Position</th>
<th>Note</th>
<th>Avis</th>
<th>Date</th>
</tr>
</thead>

<tbody>

{
latest.map((row)=>(

<tr
key={row.id}
className="border-b">

<td className="py-3 font-semibold">
{row.agency?.name || row.title || "Mondescale"}
</td>

<td>
{row.city}
</td>

<td>
{row.keyword}
</td>

<td className="font-bold">
{
row.found
?
"#" + row.position
:
"Non trouvé"
}
</td>

<td>
{row.rating || "-"}
</td>

<td>
{row.reviews || "-"}
</td>

<td>
{
row.checkedAt
?
new Date(row.checkedAt).toLocaleDateString("fr-FR")
:
"-"
}
</td>

</tr>

))
}

</tbody>

</table>

</div>

</div>


<div
className="
bg-white
rounded-2xl
shadow
p-6">

<h2
className="
text-xl
font-bold
mb-4">
Historique complet
</h2>

<div className="space-y-3">

{
checks.map((row)=>(

<div
key={row.id}
className="
border
rounded-xl
p-4
flex
justify-between
gap-4">

<div>

<div className="font-bold">
{row.agency?.name || row.title || "Mondescale"}
</div>

<div className="text-sm text-gray-500">
{row.keyword} · {row.city}
</div>

</div>

<div className="text-right">

<div className="font-bold">
{row.found ? "#" + row.position : "Non trouvé"}
</div>

<div className="text-sm text-gray-500">
{row.checkedAt ? new Date(row.checkedAt).toLocaleString("fr-FR") : ""}
</div>

</div>

</div>

))
}

</div>

</div>

</MainLayout>

  );

}
