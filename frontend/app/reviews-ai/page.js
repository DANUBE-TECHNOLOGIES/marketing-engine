import MainLayout from "../components/MainLayout";
import ReviewButtons from "./ReviewButtons";
import BatchProcessButton from "./BatchProcessButton";

async function getReviews(){

try{

const res =
await fetch(
"http://backend:4000/reviews/pending-ai",
{
cache:"no-store"
}
);

return await res.json();

}catch{

return [];

}

}

export default async function Page(){

const reviews =
await getReviews();

return(

<MainLayout
title="Avis Google IA"
subtitle="Validation IA des réponses">

<BatchProcessButton/>

<div className="space-y-5">

{

reviews.map(review=>(

<div
key={review.id}
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

<div className="font-bold">
{review.authorName}
</div>

<div>
⭐ {review.rating}/5
</div>

<div
className="
mt-2
text-gray-600">

{review.comment}

</div>

</div>

<div>

{review.agency?.name}

</div>

</div>

<div
className="
mt-4
bg-slate-50
rounded-xl
p-4">

{

review.reply ||

"Pas encore générée"

}

</div>

<ReviewButtons
reviewId={review.id}
status={review.status}
hasReply={Boolean(review.reply)}
/>

</div>

))

}

</div>

</MainLayout>

);

}
