export async function POST(request, { params }) {
  const resolvedParams = await params;
  const body = await request.json();

  const res = await fetch(`http://backend:4000/review-requests/${resolvedParams.id}/status`, {
    method: "POST",
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
