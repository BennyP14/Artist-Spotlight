import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.mzstatic.com' },
      { protocol: 'https', hostname: 'is1-ssl.mzstatic.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
  },
}

export default nextConfig
