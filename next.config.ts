import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",   // 👈 yeh line add karo
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
