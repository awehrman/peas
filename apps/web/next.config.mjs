/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@peas/components", "@peas/theme", "@peas/tailwind"],
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  serverExternalPackages: [],
};

export default nextConfig;
