"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BatchProcessButton(){

const router =
useRouter();

const [loading,setLoading] =
useState(false);

async function run(){

setLoading(true);

await fetch(
"/api/reviews/auto-process",
{
method:"POST"
}
);

router.refresh();

setLoading(false);

}

return(

<button

onClick={run}

disabled={loading}

className="
mb-6
px-5 py-3
rounded-2xl
bg-blue-100">

Traiter automatiquement tous les avis

</button>

);

}
