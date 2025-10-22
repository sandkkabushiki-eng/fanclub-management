import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Netlify用の設定
  assetPrefix: '',
  basePath: '',
  // 静的エクスポート用の設定
  distDir: 'out',
  // エクスポート時の警告を無効化
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
