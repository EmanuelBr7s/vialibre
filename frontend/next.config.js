/** @type {import('next').NextConfig} */

// Cada prefijo de la API se reenvía a su microservicio (antes lo hacía un gateway Nginx).
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8001';
const CORE_SERVICE_URL = process.env.CORE_SERVICE_URL || 'http://localhost:8002';
const MATCH_SERVICE_URL = process.env.MATCH_SERVICE_URL || 'http://localhost:8003';

// En modo mock el cliente no hace llamadas de red, así que se omite el proxy
// hacia los microservicios para evitar intentos a un host inexistente en desarrollo local.
const MOCK_MODE = process.env.NEXT_PUBLIC_API_MOCK === 'true';

const nextConfig = {
  async rewrites() {
    if (MOCK_MODE) return [];
    return [
      { source: '/api/v1/auth/:path*', destination: `${AUTH_SERVICE_URL}/api/v1/auth/:path*` },
      { source: '/api/v1/core/:path*', destination: `${CORE_SERVICE_URL}/api/v1/core/:path*` },
      { source: '/api/v1/match/:path*', destination: `${MATCH_SERVICE_URL}/api/v1/match/:path*` },
    ];
  },
};

module.exports = nextConfig;
