import { redirect } from "next/navigation";

export async function getCurrentSession() {
  const res = await fetch("http://backend:4000/session", {
    cache: "no-store"
  });

  if (!res.ok) {
    redirect("/access-denied");
  }

  return res.json();
}

export async function requireRole(allowedRoles = []) {
  const session = await getCurrentSession();
  const user = session.currentUser;

  if (!user || !allowedRoles.includes(user.role)) {
    redirect("/access-denied");
  }

  return user;
}

export async function requireAgencyAccess(agencyId) {
  const session = await getCurrentSession();
  const user = session.currentUser;

  if (!user) {
    redirect("/access-denied");
  }

  if (user.role === "admin" || user.role === "manager") {
    return user;
  }

  if (user.role === "agency" && Number(user.agencyId) === Number(agencyId)) {
    return user;
  }

  redirect("/access-denied");
}
