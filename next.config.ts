import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
