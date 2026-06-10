export async function POST(request) {
  const body = await request.json();

  const res = await fetch("http://backend:4000/reviews/generate-reply", {
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
