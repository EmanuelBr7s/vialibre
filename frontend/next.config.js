/** @type {import('next').NextConfig} */
// En modo mock el cliente no hace llamadas de red, así que se omite el proxy
// hacia el gateway para evitar intentos a un host inexistente en desarrollo local.
const MOCK_MODE = process.env.NEXT_PUBLIC_API_MOCK === 'true';

const nextConfig = {
  // Proxy API requests to the gateway in development
  async rewrites() {
    if (MOCK_MODE) return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://nginx:80/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
