"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewButtons({ reviewId, status, hasReply }) {

  const router = useRouter();
  const [loading,setLoading] = useState(false);

  async function call(path){

    setLoading(true);

    const res =
      await fetch(
        `/api/reviews/${reviewId}/${path}`,
        {
          method:"POST"
        }
      );

    if(!res.ok){
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Erreur");
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return(

<div
className="
mt-4
flex
gap-2">

<button
disabled={loading || status !== "new"}
onClick={()=>call("generate")}
className="
px-4 py-2
rounded-xl
bg-orange-100
disabled:opacity-40">

Générer IA

</button>

<button
disabled={loading || status !== "new" || !hasReply}
onClick={()=>call("approve")}
className="
px-4 py-2
rounded-xl
bg-blue-100
disabled:opacity-40">

Valider

</button>

<button
disabled={loading || status !== "pending_validation" || !hasReply}
onClick={()=>call("publish")}
className="
px-4 py-2
rounded-xl
bg-green-100
disabled:opacity-40">

Publier

</button>

</div>

);

}
