import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    resolveAlias: {
      "@vladmandic/human": "@vladmandic/human/dist/human.esm.js",
    },
  },
};

export default nextConfig;
