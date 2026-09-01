import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in pdfjs-dist, which uses Node-incompatible browser globals.
  // Keep it out of the server bundle and load it via native require instead.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
