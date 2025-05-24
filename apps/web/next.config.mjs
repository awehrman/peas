/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@peas/ui", "@peas/theme", "@peas/tailwind"],
  reactStrictMode: true,
};

export default nextConfig;
