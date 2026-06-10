import MainLayout from "../components/MainLayout";
import ActionStatusButtons from "./ActionStatusButtons";

async function getActions() {
  try {
    const res = await fetch(
      "http://backend:4000/network-actions",
      {
        cache:"no-store"
      }
    );

    return await res.json();

  } catch {

    return {
      total:0,
      todo:0,
      inProgress:0,
      done:0,
      actions:[]
    };

  }
}

export default async function Page(){

const data =
await getActions();

const actions =
data.actions || [];

return(

<MainLayout
title="Actions réseau"
subtitle="Pilotage opérationnel SEO"
>

<div
className="
grid
grid-cols-4
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
Total
</div>

<div
className="
text-3xl
font-bold">

{data.total}

</div>

</div>


<div className="
bg-white
rounded-2xl
shadow
p-5">

<div
className="
text-sm
text-gray-500">

À faire

</div>

<div
className="
text-3xl
font-bold">

{data.todo}

</div>

</div>



<div className="
bg-white
rounded-2xl
shadow
p-5">

<div
className="
text-sm
text-gray-500">

En cours

</div>

<div
className="
text-3xl
font-bold">

{data.inProgress}

</div>

</div>



<div className="
bg-white
rounded-2xl
shadow
p-5">

<div
className="
text-sm
text-gray-500">

Terminées

</div>

<div
className="
text-3xl
font-bold">

{data.done}

</div>

</div>

</div>



<div className="space-y-5">

{

actions.length===0

&&

<div
className="
bg-white
rounded-2xl
shadow
p-6">

Aucune action.

</div>

}


{

actions.map(action=>(

<div
key={action.id}

className="
bg-white
rounded-2xl
shadow
p-6">

<div
className="
flex
justify-between">

<div>

<div
className="
text-xs
uppercase
text-gray-500">

{action.agency?.city}

·

{action.lever}

</div>


<h2
className="
font-bold
text-xl
mt-2">

{action.title}

</h2>


<p
className="
text-gray-600
mt-2">

{action.description}

</p>


</div>


<div
className="
text-right">

<div
className="
font-bold">

{

action.status==="todo"

&&

"À faire"

}

{

action.status==="in_progress"

&&

"En cours"

}

{

action.status==="done"

&&

"Terminée"

}

</div>


<div
className="
text-sm
text-gray-500">

{

action.deadline

?

new Date(
action.deadline
)

.toLocaleDateString(
"fr-FR"
)

:

""

}

</div>

</div>

</div>



<div
className="
mt-4
flex
gap-3
flex-wrap">

<span
className="
px-3 py-1
rounded-full
bg-slate-100">

Responsable :

{action.owner}

</span>


<span
className="
px-3 py-1
rounded-full
bg-slate-100">

Agence :

{action.agency?.name}

</span>

</div>



<ActionStatusButtons

actionId={action.id}

currentStatus={action.status}

currentComment={action.comment}

/>



{

action.comment

&&

<div
className="
mt-4
bg-slate-50
rounded-xl
p-4">

{action.comment}

</div>

}


</div>

))

}

</div>

</MainLayout>

);

}
