import type { NextConfig } from "next";

  // Vercel asset configuration
  const assetPrefix = process.env.NEXT_PUBLIC_FRONTEND_URL ? process.env.NEXT_PUBLIC_FRONTEND_URL : '';
  const basePath = '';
  const nextConfig: NextConfig = {
    assetPrefix,
    basePath,
    images: {
      remotePatterns: [
        { protocol: "http", hostname: "localhost", port: "3004" },
        { protocol: "http", hostname: "127.0.0.1", port: "3004" },
        { protocol: "https", hostname: "giai-bong-da-doan-phuong-backend.onrender.com" },
        { protocol: "https", hostname: "**.vercel.app" },
      ],
    },
    // Ensure Turbopack knows the correct workspace root for Vercel builds
    turbopack: {
      root: ".",
    },
  };

export default nextConfig;
