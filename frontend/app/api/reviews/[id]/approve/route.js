export async function POST(request, { params }) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const res = await fetch(`http://backend:4000/reviews/${id}/approve`, {
    method: "POST"
  });

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
