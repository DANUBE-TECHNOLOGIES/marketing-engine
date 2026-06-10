import MainLayout from "../components/MainLayout";

async function getData(){

try{

const res =
await fetch(
"http://backend:4000/local-seo-score",
{
cache:"no-store"
}
);

return await res.json();

}catch{

return{
average:0,
rows:[]
};

}

}

export default async function Page(){

const data =
await getData();

return(

<MainLayout
title="Local SEO Score"
subtitle="Pilotage global du référencement local"
>

<div className="bg-white rounded-2xl shadow p-6 mb-8">

<div className="text-gray-500">
Score réseau
</div>

<div className="text-5xl font-bold">
{data.average}/100
</div>

</div>

<div className="bg-white rounded-2xl shadow p-6">

<table className="w-full">

<thead>

<tr className="border-b">

<th>Agence</th>
<th>Ville</th>
<th>Avis</th>
<th>Citations</th>
<th>Posts</th>
<th>Rankings</th>
<th>Score</th>

</tr>

</thead>

<tbody>

{data.rows.map(row=>(

<tr
key={row.agencyId}
className="border-b"
>

<td>{row.agencyName}</td>
<td>{row.city}</td>

<td>{row.reviewsScore}</td>
<td>{row.citationsScore}</td>
<td>{row.postsScore}</td>
<td>{row.rankingScore}</td>

<td className="font-bold">
{row.globalScore}
</td>

</tr>

))}

</tbody>

</table>

</div>

</MainLayout>

);

}
