/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    // A rota /exames foi retirada: os exames anteriores vivem na Biblioteca.
    return [
      { source: '/exames', destination: '/biblioteca', permanent: true },
      // O Simulador substitui a página de simulados (que tinha um simulado de demonstração).
      { source: '/aluno/simulados', destination: '/aluno/simulador', permanent: true },
      // A Comunidade e os Convites de estudante eram fictícios e foram retirados.
      { source: '/comunidade', destination: '/aluno', permanent: true },
      { source: '/aluno/convites', destination: '/aluno', permanent: true },
      { source: '/biblioteca/partilhar', destination: '/biblioteca', permanent: true },
    ]
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [{
      source: '/sw.js',
      headers: [
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Service-Worker-Allowed', value: '/' },
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
      ],
    }, {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
      ],
    }]
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
