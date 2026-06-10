export async function POST(request, { params }) {
  const resolvedParams = await params;
  const body = await request.json();

  const res = await fetch(`http://backend:4000/google-posts/${resolvedParams.id}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" }
  });
}
