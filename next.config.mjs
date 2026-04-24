/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['swisseph'],
  // Remove reactCompiler — it adds compilation overhead
};

export default nextConfig;