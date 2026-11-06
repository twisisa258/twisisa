import { pool } from '@/lib/db'
import { DeliveryError, fetchMaterialFile } from '@/lib/cloudinary-server'

export const dynamic = 'force-dynamic'

// Leitura pública (sem conta) de um exame da Biblioteca: só PDFs aprovados da categoria «Exames». Descarregar continua a exigir conta
// (/api/biblioteca/<id>/ficheiro?baixar=1). Não é indexado: o Google indexa a página do exame, não o ficheiro.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[\w-]{1,100}$/.test(id)) return new Response('Não encontrado.', { status: 404 })
  const found = await pool
    .query(
      `SELECT m.file_url, m.file_name FROM academic_materials m JOIN library_categories c ON c.id = m.category_id
       WHERE m.id = $1 AND m.status = 'approved' AND c.slug = 'exames' AND m.mime_type = 'application/pdf' LIMIT 1`,
      [id],
    )
    .catch((error) => {
      console.error('[EXAMES PUBLICOS] consulta', error)
      return null
    })
  if (!found) return new Response('Não foi possível consultar o exame.', { status: 500 })
  const material = found.rows[0] as { file_url: string; file_name: string } | undefined
  if (!material) return new Response('Não encontrado.', { status: 404 })

  let upstream: Response
  try {
    upstream = await fetchMaterialFile(material.file_url)
  } catch (error) {
    console.error('[EXAMES PUBLICOS] ficheiro', error instanceof DeliveryError ? error.detail : error)
    return new Response('Não foi possível obter o documento. Tenta outra vez mais tarde.', { status: 502 })
  }
  const safeName = material.file_name.replace(/[^\w.\- ()]+/g, '_') || 'exame.pdf'
  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${safeName}"`,
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
  })
  const length = upstream.headers.get('content-length')
  if (length) headers.set('Content-Length', length)
  return new Response(upstream.body, { status: 200, headers })
}
