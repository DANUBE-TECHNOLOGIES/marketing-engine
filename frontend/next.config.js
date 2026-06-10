/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "192.168.1.101",
    "local-engine.local",
    "localengine.mondescale.com"
  ]
};

module.exports = nextConfig;
