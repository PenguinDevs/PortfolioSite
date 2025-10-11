import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.shiroko.me',
        pathname: '/discord/avatar/**',
      },
    ],
  },
};

export default nextConfig;
