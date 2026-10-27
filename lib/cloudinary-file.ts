// Utilitários puros (sem segredos) para ler URLs de entrega do Cloudinary.
// Formato: https://res.cloudinary.com/<cloud>/<resource_type>/upload/[transformações/][v123/]<public_id>[.ext]

export type CloudinaryRef = {
  cloudName: string
  resourceType: 'image' | 'raw' | 'video'
  publicId: string // para 'image' sem extensão; para 'raw' com extensão
  extension: string
}

export function parseCloudinaryUrl(fileUrl: string): CloudinaryRef | null {
  let url: URL
  try {
    url = new URL(fileUrl)
  } catch {
    return null
  }
  if (url.hostname !== 'res.cloudinary.com') return null
  const match = url.pathname.match(/^\/([^/]+)\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/)
  if (!match) return null
  const [, cloudName, resourceType, rest] = match
  const path = decodeURIComponent(rest)
  const dot = path.lastIndexOf('.')
  const extension = dot > path.lastIndexOf('/') ? path.slice(dot + 1).toLowerCase() : ''
  const publicId = resourceType === 'raw' || dot < 0 ? path : path.slice(0, dot)
  return { cloudName, resourceType: resourceType as CloudinaryRef['resourceType'], publicId, extension }
}

// Só PDF e imagens guardados como 'image' têm pré-visualização (página convertida em JPG).
export function canPreview(fileUrl: string) {
  const ref = parseCloudinaryUrl(fileUrl)
  return !!ref && ref.resourceType === 'image'
}

// URL de uma página do documento convertida em JPG pelo Cloudinary.
export function previewPageUrl(fileUrl: string, page = 1, width = 1000) {
  const ref = parseCloudinaryUrl(fileUrl)
  if (!ref || ref.resourceType !== 'image') return null
  const pages = ref.extension === 'pdf' ? `pg_${page},` : ''
  const publicId = ref.publicId.split('/').map(encodeURIComponent).join('/')
  return `https://res.cloudinary.com/${ref.cloudName}/image/upload/${pages}f_jpg,q_auto,w_${width}/${publicId}.jpg`
}
