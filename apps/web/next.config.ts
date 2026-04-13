import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@kinetia/shared-types",
    "@kinetia/micro-json-schema",
    "@kinetia/ae-expression-compiler",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};

export default nextConfig;
