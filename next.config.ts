import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos der Website (siehe src/lib/bilder.ts) – nur dieser Host wird von next/image geladen und optimiert.
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com", port: "", pathname: "/photo-**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
