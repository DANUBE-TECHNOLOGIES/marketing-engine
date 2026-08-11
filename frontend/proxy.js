import { NextResponse } from "next/server";

export function proxy(request) {
  const pathname =
    request.nextUrl?.pathname || new URL(request.url).pathname;

  const isPublicInspirationRead =
    request.method === "GET" &&
    (pathname === "/api/website-builder/inspirations" ||
      pathname.startsWith("/api/website-builder/inspirations/"));

  const isPublicRoute =
    pathname === "/agence" ||
    pathname.startsWith("/agence/") ||
    pathname === "/sites" ||
    pathname.startsWith("/sites/") ||
    pathname === "/api/public-sites" ||
    pathname.startsWith("/api/public-sites/") ||
    pathname === "/api/public-brand-legal" ||
    pathname.startsWith("/api/public-brand-legal/") ||
    pathname === "/media" ||
    pathname.startsWith("/media/") ||
    pathname === "/brand" ||
    pathname.startsWith("/brand/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/api/google/callback" ||
    isPublicInspirationRead;

  if (isPublicRoute) {
    return NextResponse.next();
  }

  const authorization =
    request.headers.get("authorization");

  const expectedUsername =
    process.env.BASIC_AUTH_USERNAME;

  const expectedPassword =
    process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return new NextResponse(
      "Configuration d'authentification manquante",
      { status: 503 }
    );
  }

  if (authorization?.startsWith("Basic ")) {
    try {
      const encodedCredentials =
        authorization.slice(6);

      const decodedCredentials =
        atob(encodedCredentials);

      const separatorIndex =
        decodedCredentials.indexOf(":");

      if (separatorIndex >= 0) {
        const username =
          decodedCredentials.slice(
            0,
            separatorIndex
          );

        const password =
          decodedCredentials.slice(
            separatorIndex + 1
          );

        if (
          username === expectedUsername &&
          password === expectedPassword
        ) {
          return NextResponse.next();
        }
      }
    } catch {
      // Authentification incorrecte ou malformée.
    }
  }

  return new NextResponse(
    "Authentification requise",
    {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Basic realm="Mondescale Local Engine"',
      },
    }
  );
}

export const config = {
  matcher: ["/:path*"],
};
