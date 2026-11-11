import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CampaignHub serves per-tenant, per-user data on almost every dashboard page.
  // We use the classic dynamic rendering model instead of the Cache Components
  // model (cacheComponents) to keep request-time data access straightforward.
  // See docs/ARCHITECTURE.md "Rendering strategy" for the full rationale.
  serverExternalPackages: ["@prisma/client", "prisma"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
