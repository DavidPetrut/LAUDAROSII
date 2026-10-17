/**
 * Config Next.js (App Router).
 *
 * ONE SOURCE OF TRUTH: web-ul NU are DB/stocare proprie. Toate datele vin din backend-ul
 * Vertical (`server/`), prin rutele existente `/api/pc/v1/...` + auth `/api/auth/login`.
 *
 * Ca să evităm orice bătaie de cap cu CORS și ca deployment-ul în producție (web servit de
 * pe același host cu API-ul, sau din spatele unui reverse-proxy) să fie trivial, frontend-ul
 * cheamă MEREU căi relative `/api/...`. În dev, Next face proxy către backend prin `rewrites`.
 *
 * Țintă proxy configurabilă din env `PC_API_ORIGIN` (default: backend-ul local pe :3000).
 */
const API_ORIGIN = process.env.PC_API_ORIGIN || "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` },
    ];
  },
};

export default nextConfig;
