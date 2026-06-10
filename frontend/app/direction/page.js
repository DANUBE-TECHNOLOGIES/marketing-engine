import MainLayout from "../components/MainLayout";

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



return(

<MainLayout

title="Direction réseau"

subtitle="Cockpit SAS Danube"

>


<div
className="
grid
grid-cols-3
gap-6">


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
