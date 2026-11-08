/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // A Biblioteca passou a chamar-se «Exames» e é pública: /exames é a entrada (e o que o Google indexa).
      // NUNCA redirecionar /exames para outro sítio: era isto que escondia as páginas públicas.
      { source: '/biblioteca', destination: '/exames', permanent: true },
      { source: '/biblioteca/exames', destination: '/exames', permanent: true },
      { source: '/biblioteca/pesquisa', destination: '/exames/pesquisa', permanent: true },
      { source: '/biblioteca/explorar', destination: '/exames', permanent: true },
      { source: '/biblioteca/partilhar', destination: '/exames', permanent: true },
      // O Simulador substitui a página de simulados (que tinha um simulado de demonstração).
      { source: '/aluno/simulados', destination: '/aluno/simulador', permanent: true },
      // A Comunidade e os Convites de estudante eram fictícios e foram retirados.
      { source: '/comunidade', destination: '/aluno', permanent: true },
      { source: '/aluno/convites', destination: '/aluno', permanent: true },
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
