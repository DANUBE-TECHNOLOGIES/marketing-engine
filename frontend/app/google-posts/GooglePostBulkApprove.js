"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GooglePostBulkApprove(){

const router =
useRouter();

const [loading,setLoading] =
useState(false);

async function approveAll(){

setLoading(true);

const res =
await fetch(
"/api/google-posts/bulk-approve",
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({})
}
);

const data =
await res.json();

alert(
`${data.approved || 0} brouillons approuvés`
);

router.refresh();

setLoading(false);

}

return(

<button
disabled={loading}
onClick={approveAll}
className="
px-4
py-2
rounded-xl
bg-blue-100
disabled:opacity-40
"
>

Approuver tous les brouillons

</button>

);

}
