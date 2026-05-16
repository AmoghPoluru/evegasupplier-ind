import type { NextConfig } from "next";
import { withPayload } from "@payloadcms/next/withPayload";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    // Allow same-origin API file routes when `src` is a root-relative path.
    localPatterns: [{ pathname: '/api/media/**' }],
    remotePatterns: [
      // Payload / local dev: media URLs are often absolute (serverURL + /api/media/file/…)
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/api/media/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        pathname: '/api/media/**',
      },
      {
        protocol: 'https',
        hostname: 'localhost',
        pathname: '/api/media/**',
      },
      {
        protocol: 'https',
        hostname: '127.0.0.1',
        pathname: '/api/media/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        pathname: '/api/media/**',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
