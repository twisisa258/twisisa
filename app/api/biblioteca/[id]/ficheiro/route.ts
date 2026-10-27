import { headers } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { auth } from '@/lib/auth'
import { DeliveryError, fetchMaterialFile } from '@/lib/cloudinary-server'

export const dynamic = 'force-dynamic'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// Pedido feito ao abrir um link (navegação): em vez de uma página de texto, volta à página de origem com ?erro=,
// onde o modal de feedback mostra o motivo. Pedidos feitos por fetch recebem o texto, que a interface põe no modal.
function fail(request: Request, code: string, message: string, status: number, detail?: string) {
  if (request.headers.get('sec-fetch-mode') === 'navigate') {
    let path = '/biblioteca'
    try {
      const referer = new URL(request.headers.get('referer') ?? '')
      if (referer.origin === new URL(request.url).origin && !referer.pathname.startsWith('/api/')) path = referer.pathname
    } catch {}
    const target = new URL(path, request.url)
    target.searchParams.set('erro', code)
    if (detail) target.searchParams.set('d', detail)
    return Response.redirect(target, 303)
  }
  return new Response(detail ? `${message} (${detail})` : message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } })
}

// GET /api/biblioteca/<id>/ficheiro            -> abre o documento (inline)
// GET /api/biblioteca/<id>/ficheiro?baixar=1   -> descarrega o documento e regista o download
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return fail(request, 'sessao', 'Inicia sessão para aceder ao material.', 401)

  const { id } = await params
  const download = new URL(request.url).searchParams.get('baixar') === '1'

  const found = await pool
    .query(`SELECT file_url, file_name, mime_type FROM academic_materials WHERE id = $1 AND status = 'approved' LIMIT 1`, [id])
    .catch((error) => {
      console.error('[BIBLIOTECA] Erro ao consultar material', error)
      return null
    })
  if (!found) return fail(request, 'servidor', 'Não foi possível consultar o material.', 500)
  const material = found.rows[0] as { file_url: string; file_name: string; mime_type: string } | undefined
  if (!material) return fail(request, 'nao-encontrado', 'Material não encontrado.', 404)

  let upstream: Response
  try {
    upstream = await fetchMaterialFile(material.file_url)
  } catch (error) {
    const detail = error instanceof DeliveryError ? error.detail : undefined
    return fail(request, 'documento', 'Não foi possível obter o documento. Tenta outra vez mais tarde.', 502, detail)
  }

  if (download) {
    // O registo do download não pode impedir a entrega do ficheiro.
    const client = await pool.connect().catch(() => null)
    if (client) {
      try {
        await client.query('BEGIN')
        await client.query('INSERT INTO library_downloads (id, user_id, material_id) VALUES ($1, $2, $3)', [randomUUID(), session.user.id, id])
        await client.query('UPDATE academic_materials SET download_count = download_count + 1 WHERE id = $1', [id])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined)
        console.error('[BIBLIOTECA] Erro ao registar download', error)
      } finally {
        client.release()
      }
    }
  }

  const safeName = material.file_name.replace(/[^\w.\- ()]+/g, '_') || 'documento'
  const responseHeaders = new Headers({
    'Content-Type': material.mime_type || 'application/octet-stream',
    'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(material.file_name)}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  const length = upstream.headers.get('content-length')
  if (length) responseHeaders.set('Content-Length', length)
  return new Response(upstream.body, { status: 200, headers: responseHeaders })
}
