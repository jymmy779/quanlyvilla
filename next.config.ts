import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "knex",
    "better-sqlite3",
    "mysql",
    "mysql2",
    "oracledb",
    "pg",
    "pg-native",
    "sqlite3",
    "tedious",
  ],
};

export default nextConfig;