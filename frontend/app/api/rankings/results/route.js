export async function POST(request) {
  const body = await request.json();

  const res = await fetch("http://backend:4000/rankings/results", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return new Response(await res.text(), {
    status: res.status
  });
}
