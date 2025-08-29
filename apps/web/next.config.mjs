/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@peas/components", "@peas/theme", "@peas/tailwind"],
  reactStrictMode: true,
};

export default nextConfig;
