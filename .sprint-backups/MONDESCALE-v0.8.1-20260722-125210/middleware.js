import { NextResponse } from "next/server";

export function middleware(request) {
  // MONDESCALE_PUBLIC_AGENCY_SITE: mini-sites publics, back-office toujours protégé.
  const mondescalePathname = request.nextUrl?.pathname || new URL(request.url).pathname;
  if (pathname.startsWith("/agence") ||
    mondescalePathname === "/agence" || mondescalePathname.startsWith("/agence/")) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/brand") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/api/google/callback"
  ) {
    return NextResponse.next();
  }

  const basicAuth = request.headers.get("authorization");
  const username = process.env.BASIC_AUTH_USERNAME;
  const password = process.env.BASIC_AUTH_PASSWORD;

  if (!username || !password) {
    return new NextResponse("Configuration d'authentification manquante", {
      status: 503
    });
  }

  if (basicAuth?.startsWith("Basic ")) {
    try {
      const authValue = basicAuth.slice(6);
      const decoded = atob(authValue);
      const separator = decoded.indexOf(":");
      const user = decoded.slice(0, separator);
      const pwd = decoded.slice(separator + 1);

      if (separator >= 0 && user === username && pwd === password) {
        return NextResponse.next();
      }
    } catch {
      // Une entête Basic malformée doit simplement être refusée.
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
  matcher: ["/:path*"],
};
