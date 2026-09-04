import Image from "next/image";
import Link from "next/link";

export default function MainLayout({

title,
subtitle,
children

}){

const sections=[

{
label:"Direction",
items:[
["🏠 Cockpit","/direction"],
["📥 Demandes clients","/leads"],
["⚠ Alertes","/direction"],
["🏆 Classement","/direction"]
]
},

{
label:"Réputation",
items:[
["⭐ Avis IA","/reviews-ai"],
["💬 Avis réseau","/google-reviews-network"]
]
},

{
label:"SEO Local",
items:[
["🧭 Cockpit SEO","/seo-cockpit"],
["⚙ Opérations d'indexation","/seo-cockpit/operations"],
["🛡 Runtime rollback","/seo-cockpit/runtime"],
["📍 Rankings","/rankings"],
["🗺 Visibilité Maps","/ranking-grid"],
["🔎 Keywords","/seo-keywords-db"],
["📣 Google Posts","/google-posts"]
]
},

{
label:"Agences",
items:[
["🏢 Agences","/agencies"],
["📊 Performance","/direction"]
]
},

{
label:"ERP",
items:[
["💼 Devis","/quotes"],
["💰 CA potentiel","/dashboard"]
]
},

{
label:"Paramètres",
items:[
["⚙ Configuration","/settings"]
]
}

];

return(

<div className="min-h-screen flex bg-slate-100">

{/* SIDEBAR */}

<div
className="
w-72
bg-[#0f2e46]
text-white
p-6
overflow-y-auto">

<div className="mb-10">

<Image
src="/brand/logo-mondescale.png"
width={170}
height={60}
alt="Mondescale"
/>

</div>


{sections.map(section=>(

<div
key={section.label}
className="mb-8">

<div
className="
uppercase
text-xs
opacity-60
mb-3">

{section.label}

</div>

<div className="space-y-2">

{section.items.map(item=>(

<Link
key={item[1]}
href={item[1]}

className="
block
px-4
py-3
rounded-xl
hover:bg-[#1d4d73]
transition">

{item[0]}

</Link>

))}

</div>

</div>

))}

</div>



{/* CONTENU */}

<div className="flex-1 p-8">

<div className="mb-8">

<h1
className="
text-4xl
font-bold">

{title}

</h1>

<div
className="
text-gray-500
mt-2">

{subtitle}

</div>

</div>

{children}

</div>

</div>

)

}
