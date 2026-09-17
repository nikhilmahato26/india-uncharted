import type { NextConfig } from "next";

// Uploaded images live on Cloudinary in production. Only this account's image
// path is allowed through the optimiser, not every Cloudinary URL on the web.
const cloudinaryImages = process.env.CLOUDINARY_CLOUD_NAME
  ? [new URL(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME.trim()}/image/upload/**`)]
  : [];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Trailing slashes are handled in proxy.ts so migrated WordPress URLs
  // ("/about-us/") resolve in a single 301 instead of 308 → 301.
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [96, 160, 240, 320, 480],
    qualities: [70, 75, 80],
    remotePatterns: cloudinaryImages,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
