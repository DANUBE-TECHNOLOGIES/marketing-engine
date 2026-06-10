async function getPriorities(){

try{

const res =
await fetch(
"http://backend:4000/priorities",
{
cache:"no-store"
}
);

return await res.json();

}catch{

return {
top5:[]
};

}

}

export default async function TopPriorities(){

const data =
await getPriorities();

return(

<div className="bg-white rounded-2xl shadow p-6 mb-8">

<h2 className="text-xl font-bold mb-4">
🔥 Top 5 agences à travailler
</h2>

<div className="space-y-4">

{data.top5.map((row,index)=>(

<div
key={row.agencyId}
className="border rounded-xl p-4"
>

<div className="flex justify-between">

<div>

<div className="font-bold">
#{index+1} {row.city}
</div>

<div className="text-sm text-gray-500">
{row.agency}
</div>

</div>

<div className="text-right">

<div className="font-bold">
{row.priority}
</div>

<div className="text-sm">
Score {row.score}
</div>

</div>

</div>

<div className="mt-2 text-sm">

Position moyenne :
{row.averagePosition}

<br/>

Avis 30 jours :
{row.reviews30}

<br/>

Posts 30 jours :
{row.posts30}

</div>

</div>

))}

</div>

</div>

);

}
