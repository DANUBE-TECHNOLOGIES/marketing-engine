import MainLayout from "../components/MainLayout";

async function getData(){

try{

const res =
await fetch(
"http://backend:4000/review-responses",
{
cache:"no-store"
}
);

return await res.json();

}catch{

return{
total:0,
draft:0,
approved:0,
published:0,
responses:[]
};

}

}

export default async function Page(){

const data =
await getData();

return(

<MainLayout
title="Réponses aux avis Google"
subtitle="Réponses SEO proposées"
>

<div className="grid grid-cols-4 gap-4 mb-8">

<div className="bg-white rounded-2xl shadow p-5">
<div className="text-sm text-gray-500">Total</div>
<div className="text-3xl font-bold">{data.total}</div>
</div>

<div className="bg-slate-50 rounded-2xl shadow p-5">
<div className="text-sm text-gray-500">Brouillons</div>
<div className="text-3xl font-bold">{data.draft}</div>
</div>

<div className="bg-blue-50 rounded-2xl shadow p-5">
<div className="text-sm text-gray-500">Validées</div>
<div className="text-3xl font-bold">{data.approved}</div>
</div>

<div className="bg-green-50 rounded-2xl shadow p-5">
<div className="text-sm text-gray-500">Publiées</div>
<div className="text-3xl font-bold">{data.published}</div>
</div>

</div>

<div className="space-y-6">

{data.responses.map(r=>(

<div
key={r.id}
className="bg-white rounded-2xl shadow p-6"
>

<div className="font-bold">
{r.agency?.name}
</div>

<div className="text-sm text-gray-500 mb-3">
⭐ {r.reviewRating}/5
</div>

<div className="bg-slate-50 p-4 rounded-xl mb-4">
{r.reviewText}
</div>

<div className="bg-green-50 p-4 rounded-xl whitespace-pre-line">
{r.responseText}
</div>

</div>

))}

</div>

</MainLayout>

);

}
