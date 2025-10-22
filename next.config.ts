import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Netlify用の設定
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  basePath: '',
  // 静的エクスポート用の設定
  distDir: 'out',
};

export default nextConfig;
