export async function POST(request) {
  const body = await request.json();

  const res = await fetch("http://backend:4000/google-posts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json" }
  });
}
