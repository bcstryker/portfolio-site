const { i18n } = require("./next-i18next.config");


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  pageExtensions: ['tsx'],
  typescript: {
    ignoreBuildErrors: true,
  },
  i18n,
  webpack5: true,
  webpack(config, context) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
}

module.exports = nextConfig
