import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    // Port configured in flipflop/.env: API_GATEWAY_PORT (default: 3511 host, 3011 container)
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.API_GATEWAY_PORT || '3011'}/api`,
  },
};

export default nextConfig;
