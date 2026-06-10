"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ActionStatusButtons({
  actionId,
  currentStatus,
  currentComment
}) {

  const router = useRouter();

  const [loading,setLoading] =
    useState(false);

  const [comment,setComment] =
    useState(currentComment || "");

  async function update(status){

    setLoading(true);

    await fetch(
      `/api/network-actions/${actionId}`,
      {
        method:"PATCH",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          status,
          comment
        })
      }
    );

    setLoading(false);

    router.refresh();
  }

  return(

<div className="mt-4">

<textarea
value={comment}
onChange={e=>setComment(e.target.value)}
placeholder="Commentaire / avancement..."
className="
w-full
border
rounded-xl
p-3
mb-3"
/>

<div className="flex gap-2">

<button
onClick={()=>update("todo")}
className="
px-3 py-2
rounded-xl
bg-slate-100">
À faire
</button>

<button
onClick={()=>update("in_progress")}
className="
px-3 py-2
rounded-xl
bg-orange-100">
En cours
</button>

<button
onClick={()=>update("done")}
className="
px-3 py-2
rounded-xl
bg-green-100">
Terminée
</button>

</div>

</div>

);

}
