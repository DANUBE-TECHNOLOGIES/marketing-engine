export async function POST(req) {
  const body = await req.json().catch(() => ({ max: 10 }));

  const res = await fetch("http://backend:4000/google-posts/publish-queue", {
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
