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
  // Turbopack is default in Next.js 16 — no config needed.
  // Empty turbopack key silences the webpack conflict warning.
  turbopack: {},
};

export default withPWA(nextConfig);
