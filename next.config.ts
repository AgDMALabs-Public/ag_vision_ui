import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ['@agv_ui/styles'],
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
  serverExternalPackages: ['chokidar'],


};

export default nextConfig;
