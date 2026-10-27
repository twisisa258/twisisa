/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // A rota /exames foi retirada: os exames anteriores vivem na Biblioteca.
    return [
      { source: '/exames', destination: '/biblioteca', permanent: true },
      // O Simulador substitui a página de simulados (que tinha um simulado de demonstração).
      { source: '/aluno/simulados', destination: '/aluno/simulador', permanent: true },
    ]
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }]
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
