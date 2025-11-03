import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        port: "",
        pathname: "/**",
      },
    ],
  },

  // ✅ Ignore all TypeScript build errors
  typescript: {
    ignoreBuildErrors: true,
  },

  // ✅ Ignore all ESLint build errors
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
