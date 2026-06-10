import { redirect } from "next/navigation";

export async function POST(req, { params }) {
  await fetch(`http://backend:4000/seo-actions/${params.id}/done`, {
    method: "POST"
  });

  redirect("/seo-actions");
}
