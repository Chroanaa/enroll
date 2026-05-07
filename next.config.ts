import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingRoot: process.cwd(),
  // Allow cross-origin requests from local network during development
  allowedDevOrigins: ['192.168.56.1'],
  
  webpack: (config, { isServer }) => {
    // Fix for Watchpack Error on Windows
    if (!isServer) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules',
          '**/.git',
          '**/.next',
          '**/pagefile.sys',
          '**/hiberfil.sys',
          '**/swapfile.sys',
          'D:/pagefile.sys',
          'D:/hiberfil.sys',
          'D:/swapfile.sys',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
