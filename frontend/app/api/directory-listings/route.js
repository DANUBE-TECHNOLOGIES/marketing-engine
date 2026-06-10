export async function POST(request) {
  try {
    const body = await request.json();

    const res = await fetch("http://backend:4000/directory-listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
