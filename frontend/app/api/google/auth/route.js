export async function GET() {
  const res = await fetch("http://backend:4000/api/google/auth", {
    redirect: "manual"
  });

  const location = res.headers.get("location");

  if (location) {
    return Response.redirect(location, 302);
  }

  const text = await res.text();

  return new Response(text, {
    status: res.status
  });
}
