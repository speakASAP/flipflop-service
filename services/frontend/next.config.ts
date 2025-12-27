import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    // Port configured in flipflop/.env: API_GATEWAY_PORT (default: 3511 host, 3011 container)
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || `http://localhost:${process.env.API_GATEWAY_PORT || '3011'}/api`,
  },
  images: {
    // Disable image optimization to prevent zombie processes from image processing
    // Images will be served as-is without optimization
    unoptimized: true,
  },
  // Reduce memory usage during builds and runtime
  experimental: {
    // Reduce memory usage during webpack compilation
    webpackMemoryOptimizations: true,
  },
  // Disable source maps in production to reduce memory usage
  productionBrowserSourceMaps: false,
  // Suppress error overlay in production to reduce noise
  reactStrictMode: true,
  // Logging configuration
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  // Error handling - suppress known Next.js internal errors
  onDemandEntries: {
    // Period in ms to keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
};

export default nextConfig;
