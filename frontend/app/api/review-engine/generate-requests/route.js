export async function POST() {
  const res = await fetch("http://backend:4000/review-engine/generate-requests", {
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
