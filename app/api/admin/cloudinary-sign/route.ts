import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/admin'

export const dynamic = 'force-dynamic'

// Pastas permitidas. Sem corpo no pedido usa-se "materiais" (comportamento anterior).
const FOLDERS: Record<string, string> = {
  materiais: 'estuda-mz/materiais',
  logotipos: 'estuda-mz/logotipos',
}

// Devolve parâmetros assinados para o browser enviar o ficheiro directamente ao Cloudinary.
// O ficheiro nunca passa por este servidor (evita o limite de corpo das funções da Vercel).
export async function POST(request: Request) {
  const admin = await getAdminUser()
  if (!admin) return NextResponse.json({ error: 'Acesso reservado à administração.' }, { status: 403 })

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'O Cloudinary não está configurado no servidor (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).' },
      { status: 500 },
    )
  }

  let requested = 'materiais'
  try {
    const body = (await request.json()) as { pasta?: unknown }
    if (typeof body?.pasta === 'string') requested = body.pasta
  } catch {
    // Pedido sem corpo: fica a pasta por defeito.
  }
  const folder = FOLDERS[requested]
  if (!folder) return NextResponse.json({ error: 'Pasta de carregamento inválida.' }, { status: 400 })

  const params: Record<string, string> = {
    folder,
    timestamp: String(Math.floor(Date.now() / 1000)),
    unique_filename: 'true',
    use_filename: 'true',
  }
  // Assinatura Cloudinary: parâmetros por ordem alfabética, k=v unidos por &, seguidos do segredo, SHA-1.
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  const signature = createHash('sha1').update(toSign + apiSecret).digest('hex')

  return NextResponse.json({ cloudName, apiKey, signature, ...params }, { headers: { 'Cache-Control': 'no-store' } })
}
