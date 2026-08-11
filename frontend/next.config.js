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

const nextConfig = {
  allowedDevOrigins: [
    "192.168.1.101",
    "local-engine.local",
    "localengine.mondescale.com",
  ],

  async headers() {
    return [
      {
        source: "/agence/:path*",
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
