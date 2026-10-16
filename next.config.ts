import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode:false,
   images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        
      },
    ],
  },
};

export default nextConfig;
