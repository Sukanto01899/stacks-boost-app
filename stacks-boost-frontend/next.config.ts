import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      pino: "pino/browser",
      "thread-stream": path.join(__dirname, "lib/empty-module.ts"),
    },
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      pino: "pino/browser",
      "thread-stream": path.join(__dirname, "lib/empty-module.ts"),
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
      };
    }

    return config;
  },
};

export default nextConfig;
