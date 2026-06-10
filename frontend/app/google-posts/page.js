import MainLayout from "../components/MainLayout";
import GooglePostButtons from "./GooglePostButtons";
import GooglePostBulkApprove from "./GooglePostBulkApprove";
import GooglePostBulkActions from "./GooglePostBulkActions";

async function getPosts(){

try{

const res =
await fetch(
"http://backend:4000/google-posts",
{
cache:"no-store"
}
);

return await res.json();

}catch{

return {
total:0,
draft:0,
planned:0,
published:0,
error:0,
posts:[]
};

}

}

export default async function Page(){

const data =
await getPosts();

const posts =
(data.posts || []).sort((a,b)=>
  (b.seoScore || 0) - (a.seoScore || 0)
);

return(

<MainLayout
title="Google Posts"
subtitle="Préparation, validation et publication réelle Google Business Profile"
>

<div className="grid grid-cols-5 gap-4 mb-8">

<div className="bg-white rounded-2xl shadow p-5">
<div className="text-sm text-gray-500">Total</div>
<div className="text-3xl font-bold">{data.total}</div>
</div>

<div className="bg-white rounded-2xl shadow p-5">
<div className="text-sm text-gray-500">Brouillons</div>
<div className="text-3xl font-bold">{data.draft}</div>
</div>

<div className="bg-white rounded-2xl shadow p-5">
<div className="text-sm text-gray-500">Planifiés</div>
<div className="text-3xl font-bold">{data.planned}</div>
</div>

<div className="bg-white rounded-2xl shadow p-5">
<div className="text-sm text-gray-500">Publiés</div>
<div className="text-3xl font-bold">{data.published}</div>
</div>

<div className="bg-white rounded-2xl shadow p-5">
<div className="text-sm text-gray-500">Erreurs</div>
<div className="text-3xl font-bold">{data.error || 0}</div>
</div>

</div>

<div className="flex gap-3 mb-4">
<GooglePostBulkApprove />
</div>

<GooglePostBulkActions />

<div className="space-y-5">

{posts.length===0 && (
<div className="bg-white rounded-2xl shadow p-6">
Aucun Google Post.
</div>
)}

{posts.map(post=>(

<div
key={post.id}
className={`
rounded-2xl
shadow
p-6
${post.status==="error" ? "bg-red-50" : "bg-white"}
`}
>

<div className="flex justify-between gap-4">

<div>
<div className="text-xs uppercase text-gray-500 mb-1">
{post.agency?.city || "Réseau"} · {post.status}
</div>

<h2 className="text-xl font-bold">
{post.title}
</h2>

<div className="mt-2 flex gap-2 flex-wrap text-sm">

<span className={`px-3 py-1 rounded-full ${
(post.seoScore || 0) >= 80
? "bg-green-100"
: (post.seoScore || 0) >= 60
? "bg-yellow-100"
: "bg-red-100"
}`}>
Score SEO : {post.seoScore || 0}/100
</span>

{post.seoKeyword && (
<span className="px-3 py-1 rounded-full bg-blue-100">
Mot-clé : {post.seoKeyword}
</span>
)}

{post.imageCategory && (
<span className="px-3 py-1 rounded-full bg-slate-100">
Image : {post.imageCategory}
</span>
)}

</div>

{post.imageUrl && (
<img
src={post.imageUrl}
alt=""
className="mt-4 rounded-xl max-h-64 object-cover"
/>
)}

<p className="text-gray-700 mt-3 whitespace-pre-line">
{post.content}
</p>

{post.ctaLabel && (
<div className="mt-4 text-sm text-gray-500">
CTA : {post.ctaLabel} {post.ctaUrl ? `→ ${post.ctaUrl}` : ""}
</div>
)}

{post.googlePostName && (
<div className="mt-4 bg-green-50 rounded-xl p-4 text-sm">
<div className="font-bold text-green-800">
Publié sur Google Business Profile
</div>

<div className="text-green-700 break-all mt-1">
{post.googlePostName}
</div>

{post.publishedUrl && (
<a
href={post.publishedUrl}
target="_blank"
className="inline-block mt-2 underline text-green-800"
>
Voir le post Google
</a>
)}
</div>
)}

{post.lastPublishError && (
<div className="mt-4 bg-red-100 rounded-xl p-4 text-sm text-red-800 whitespace-pre-wrap">
{post.lastPublishError}
</div>
)}

</div>

<div className="text-right text-sm text-gray-500 min-w-40">
<div>{post.agency?.name || "Réseau"}</div>
<div>
{post.plannedAt
? new Date(post.plannedAt).toLocaleDateString("fr-FR")
: "Non planifié"}
</div>
<div className="mt-2">
{post.publishedAt
? "Publié le " + new Date(post.publishedAt).toLocaleDateString("fr-FR")
: ""}
</div>
</div>

</div>

<GooglePostButtons
postId={post.id}
currentStatus={post.status}
googlePostName={post.googlePostName}
/>

</div>

))}

</div>

</MainLayout>

);

}
