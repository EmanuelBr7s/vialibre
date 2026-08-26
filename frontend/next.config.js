/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API requests to the gateway in development
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://nginx:80/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
