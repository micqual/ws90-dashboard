/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', '@sparticuz/chromium', 'puppeteer-core'],
  },
}

export default nextConfig
