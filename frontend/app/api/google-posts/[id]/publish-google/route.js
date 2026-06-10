export async function POST(req, context) {
  const params = await context.params;

  const res = await fetch(
    `http://backend:4000/google-posts/${params.id}/publish-google`,
    {
      method: "POST"
    }
  );

  const text = await res.text();

  return new Response(text, {
    status: res.status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}
