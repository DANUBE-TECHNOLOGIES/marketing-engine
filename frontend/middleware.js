import { NextResponse } from "next/server";

export function middleware(request) {
  const pathname =
    request.nextUrl?.pathname || new URL(request.url).pathname;

  // Mini-sites publics.
  if (pathname === "/agence" || pathname.startsWith("/agence/")) {
    return NextResponse.next();
  }

  // Ressources Next.js et routes publiques techniques.
  if (
    pathname.startsWith("/brand") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/api/google/callback"
  ) {
    return NextResponse.next();
  }

  const basicAuth = request.headers.get("authorization");
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return new NextResponse(
      "Configuration d'authentification manquante",
      { status: 503 }
    );
  }

  if (basicAuth?.startsWith("Basic ")) {
    try {
      const authValue = basicAuth.slice(6);
      const decoded = atob(authValue);
      const separator = decoded.indexOf(":");

      if (separator >= 0) {
        const user = decoded.slice(0, separator);
        const pwd = decoded.slice(separator + 1);

        if (user === username && pwd === password) {
          return NextResponse.next();
        }
      }
    } catch {
      // Une entête Basic malformée est simplement refusée.
    }
  }

  return new NextResponse("Authentification requise", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Mondescale Local Engine"',
    },
  });
}

export const config = {
  matcher: ["/((?!agence(?:/|$)).*)"],
};
