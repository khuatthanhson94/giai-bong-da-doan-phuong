import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "3004" },
      { protocol: "http", hostname: "127.0.0.1", port: "3004" },
    ],
  },
  // Ensure Turbopack knows the correct workspace root for Vercel builds
  turbopack: {
    root: ".",
  },
};

export default nextConfig;
