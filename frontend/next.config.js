/** @type {import('next').NextConfig} */
const publicSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

function backendOrigin() {
  return String(
    process.env.BACKEND_INTERNAL_URL ||
    process.env.MONDESCALE_BACKEND_URL ||
    "http://backend:4000"
  ).replace(/\/+$/, "");
}

const nextConfig = {
  allowedDevOrigins: [
    "192.168.1.101",
    "local-engine.local",
    "localengine.mondescale.com",
  ],

  async rewrites() {
    const origin = backendOrigin();
    return [
      {
        source: "/media/assets/:path*",
        destination: `${origin}/media/assets/:path*`,
      },
      {
        source: "/media/brand-assets/:path*",
        destination: `${origin}/media/brand-assets/:path*`,
      },
    ];
  },

  async headers() {
    return [
      {
        source: "/agence/:path*",
        headers: publicSecurityHeaders,
      },
      {
        source: "/media/:path*",
        headers: publicSecurityHeaders,
      },
      {
        source: "/sitemap.xml",
        headers: publicSecurityHeaders,
      },
      {
        source: "/robots.txt",
        headers: publicSecurityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
