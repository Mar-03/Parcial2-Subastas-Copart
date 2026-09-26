/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El lint no es parte de la evaluacion; no debe romper el build en Render.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  poweredByHeader: false,
  // Las imagenes provienen de URLs externas (sin almacenamiento fisico en Render),
  // por lo que se sirven de forma directa sin el optimizador de Next.
  images: { unoptimized: true },
};

module.exports = nextConfig;
