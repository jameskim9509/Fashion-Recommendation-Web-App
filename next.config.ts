import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Docker 런타임 이미지를 최소화하기 위한 독립 실행형 출력.
  // .next/standalone 에 server.js + 필요한 node_modules 만 포함된다.
  output: "standalone",
};

export default nextConfig;
