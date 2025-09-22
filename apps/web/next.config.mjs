/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@peas/components", "@peas/theme", "@peas/tailwind"],
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [],
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
