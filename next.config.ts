import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Open the app via the machine's LAN IP (QR/phone testing) — without this
  // Next 16 blocks the HMR websocket from that origin, leaving tabs stale.
  allowedDevOrigins: ["192.168.1.146"],
  images: {
    // Menu photos/logos come from arbitrary backend URLs (any image host).
    // Serving them unoptimized sidesteps remote-domain allow-listing while
    // keeping the Next/Image layout API and its fallbacks.
    unoptimized: true,
  },
};

export default nextConfig;
