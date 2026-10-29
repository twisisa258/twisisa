import { createHash } from 'node:crypto'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AVATAR_FOLDER } from '@/lib/perfil'

export const dynamic = 'force-dynamic'

// Assina o envio da foto de perfil. O ficheiro vai do browser directamente ao Cloudinary.
// O nome do ficheiro é o id do aluno: cada aluno só pode substituir a sua própria foto.
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: 'A tua sessão expirou. Inicia sessão outra vez.' }, { status: 401 })

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: 'O carregamento de fotos não está disponível de momento.' }, { status: 500 })

  const params: Record<string, string> = {
    allowed_formats: 'jpg,png,webp',
    folder: AVATAR_FOLDER,
    invalidate: 'true',
    overwrite: 'true',
    public_id: session.user.id,
    timestamp: String(Math.floor(Date.now() / 1000)),
  }
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  const signature = createHash('sha1').update(toSign + apiSecret).digest('hex')

  return NextResponse.json({ cloudName, apiKey, signature, ...params }, { headers: { 'Cache-Control': 'no-store' } })
}
