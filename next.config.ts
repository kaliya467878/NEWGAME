import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      // CMS image uploads go through a server action; allow 4MB images
      // plus multipart overhead.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
