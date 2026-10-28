/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three'],
  async rewrites() {
    const coreApiUrl =
      process.env.CORE_API_URL ||
      process.env.NEXT_PUBLIC_CORE_API_URL ||
      'http://localhost:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${coreApiUrl}/api/v1/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${coreApiUrl}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;
