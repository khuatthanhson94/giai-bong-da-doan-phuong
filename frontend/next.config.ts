import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "3004" },
      { protocol: "http", hostname: "127.0.0.1", port: "3004" },
      { protocol: "https", hostname: "**" },
    ],
  },
  // Ensure Turbopack knows the correct workspace root for Vercel builds
  turbopack: {
    root: ".",
  },
  async rewrites() {
    const apiTarget = process.env.NEXT_PUBLIC_API_URL;
    if (apiTarget && apiTarget.startsWith("http")) {
      return [
        {
          source: "/api/:path*",
          destination: `${apiTarget}/:path*`,
        },
      ];
    }
    // Fallback: if NEXT_PUBLIC_API_URL is relative or not defined, don't rewrite
    return [];
  },
};

export default nextConfig;
