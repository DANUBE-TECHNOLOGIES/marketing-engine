export async function POST(req, context){

const params =
await context.params;

const res =
await fetch(
`http://backend:4000/reviews/${params.id}/generate`,
{
method:"POST"
}
);

const data =
await res.text();

return new Response(
data,
{
status:res.status,
headers:{
"Content-Type":"application/json"
}
}
);

}
