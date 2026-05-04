/** @type {import('next').NextConfig} */
const cdnBase = process.env.NEXT_PUBLIC_IMAGE_CDN_BASE;
let remotePatterns = [];

if (cdnBase) {
  try {
    const parsed = new URL(cdnBase);
    remotePatterns = [{
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      pathname: '/**',
    }];
  } catch {
    // Invalid CDN URL: keep remote patterns disabled.
  }
}

const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns,
    qualities: [10, 20, 40, 60, 70, 75, 80, 82, 85, 90],
    minimumCacheTTL: 2592000,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  allowedDevOrigins: ["10.104.144.172", "10.0.0.42", "localhost:3000"]
};

module.exports = nextConfig;
