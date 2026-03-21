import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatar.talk.vtalk.ai',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
