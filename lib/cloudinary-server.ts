import { createHash } from 'node:crypto'
import { parseCloudinaryUrl } from '@/lib/cloudinary-file'

// Erro de entrega com o motivo técnico (estados HTTP e erro do Cloudinary) para diagnóstico.
export class DeliveryError extends Error {
  detail: string
  constructor(message: string, detail: string) {
    super(message)
    this.detail = detail
  }
}

function clean(value: string | null | undefined) {
  return (value ?? '').replace(/[^\w .:\-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70)
}

function credentials() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return null
  return { cloudName, apiKey, apiSecret }
}

function sign(params: Record<string, string>, secret: string) {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return createHash('sha1').update(toSign + secret).digest('hex')
}

// Descarrega o ficheiro: primeiro o URL público; se o Cloudinary o recusar
// (ex.: entrega de PDF bloqueada na conta), usa o descarregamento assinado da API.
export async function fetchMaterialFile(fileUrl: string): Promise<Response> {
  const direct = await fetch(fileUrl, { cache: 'no-store' }).catch(() => null)
  if (direct?.ok && direct.body) return direct
  const directDetail = direct ? `público ${direct.status} ${clean(direct.headers.get('x-cld-error'))}`.trim() : 'público sem resposta'
  console.error('[BIBLIOTECA] URL público recusado', directDetail)

  const ref = parseCloudinaryUrl(fileUrl)
  const cred = credentials()
  if (!ref || !cred || ref.cloudName !== cred.cloudName) {
    throw new DeliveryError('Não foi possível obter o documento.', `${directDetail}; assinado indisponível (configuração ou URL)`)
  }

  const params: Record<string, string> = {
    public_id: ref.publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: 'upload',
  }
  if (ref.resourceType !== 'raw' && ref.extension) params.format = ref.extension
  const query = new URLSearchParams({ ...params, api_key: cred.apiKey, signature: sign(params, cred.apiSecret) })
  const signed = await fetch(`https://api.cloudinary.com/v1_1/${cred.cloudName}/${ref.resourceType}/download?${query}`, { cache: 'no-store' }).catch(() => null)
  if (signed?.ok && signed.body) return signed
  const body = signed && !signed.ok ? clean(await signed.text().catch(() => '')) : ''
  const signedDetail = signed ? `assinado ${signed.status} ${clean(signed.headers.get('x-cld-error'))} ${body}`.replace(/\s+/g, ' ').trim() : 'assinado sem resposta'
  console.error('[BIBLIOTECA] Descarregamento assinado recusado', signedDetail)
  throw new DeliveryError('Não foi possível obter o documento.', `${directDetail}; ${signedDetail}`)
}

// Remove o ficheiro do Cloudinary. Devolve false se falhar (o registo na BD é tratado à parte).
export async function destroyMaterialFile(fileUrl: string): Promise<boolean> {
  const ref = parseCloudinaryUrl(fileUrl)
  const cred = credentials()
  if (!ref || !cred || ref.cloudName !== cred.cloudName) return false
  const params: Record<string, string> = {
    invalidate: 'true',
    public_id: ref.publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
  }
  const body = new URLSearchParams({ ...params, api_key: cred.apiKey, signature: sign(params, cred.apiSecret) })
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cred.cloudName}/${ref.resourceType}/destroy`, { method: 'POST', body })
    const data = (await response.json().catch(() => null)) as { result?: string } | null
    return response.ok && (data?.result === 'ok' || data?.result === 'not found')
  } catch {
    return false
  }
}
