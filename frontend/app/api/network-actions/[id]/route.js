export async function PATCH(req, context) {
  const body = await req.json();
  const params = await context.params;

  const res = await fetch(`http://backend:4000/network-actions/${params.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
