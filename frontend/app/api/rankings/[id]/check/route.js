export async function POST(request, { params }) {
  const resolvedParams = await params;

  const res = await fetch(`http://backend:4000/rankings/${resolvedParams.id}/check`, {
    method: "POST"
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
