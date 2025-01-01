/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
    unoptimized: true
  },
  // Enable static exports
  trailingSlash: true,
  // Ensure proper handling of static assets
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig;
