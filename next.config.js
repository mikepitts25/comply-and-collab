/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb", // ACAS .nessus exports can be large
    },
  },
};

module.exports = nextConfig;
