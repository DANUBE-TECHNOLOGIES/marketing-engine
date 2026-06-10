export async function GET() {
  const res = await fetch("http://backend:4000/reviews/unanswered", {
    cache: "no-store"
  });

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
