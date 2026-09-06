import type { NextConfig } from "next";

// STATIC_EXPORT=1 keeps the portable static export (Netlify / platform static).
// Default is full-stack server mode so /api routes and persistence are active.
const nextConfig: NextConfig = {
  ...(process.env.STATIC_EXPORT === "1" ? { output: "export" as const } : {}),
  // Next 16 dev 默认只放行 localhost；放行 127.0.0.1 / 局域网 IP，
  // 否则 dev 资源被 cross-origin 拦截导致页面不水合、/api 同步失效
  allowedDevOrigins: ["127.0.0.1", "192.168.31.95"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
