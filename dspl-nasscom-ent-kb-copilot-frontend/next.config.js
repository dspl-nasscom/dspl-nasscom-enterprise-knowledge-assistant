/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/chat',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/docs/kb-documents/:filename*',
        destination: 'https://storage.googleapis.com/nasscom-docs/kb-documents/:filename*',
      },
      {
        source: '/nasscom-docs/:path*',
        destination: 'https://storage.googleapis.com/nasscom-docs/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
