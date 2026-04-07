import withPWAFunc from 'next-pwa';

const withPWA = withPWAFunc({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, 
  },
  experimental: {
    turbopack: {},
  },
};

export default withPWA(nextConfig);
