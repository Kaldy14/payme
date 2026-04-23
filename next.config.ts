import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
