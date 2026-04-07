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
  swcMinify: true,
  images: {
    unoptimized: true, 
  },
};

export default withPWA(nextConfig);
