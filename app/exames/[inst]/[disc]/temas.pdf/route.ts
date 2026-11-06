import { headers } from 'next/headers'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { auth } from '@/lib/auth'
import { getSubjectPage } from '@/lib/exames'
import { pdfSafe, wrapLines } from '@/lib/exames-pure'

export const dynamic = 'force-dynamic'

// PDF dos temas principais de uma disciplina. Descarregar exige conta (quem não tem vai criá-la e volta à página).
export async function GET(request: Request, { params }: { params: Promise<{ inst: string; disc: string }> }) {
  const { inst, disc } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return Response.redirect(new URL(`/sign-up?next=${encodeURIComponent(`/exames/${inst}/${disc}`)}`, request.url), 303)

  const page = await getSubjectPage(inst, disc).catch(() => null)
  if (!page || page.topics.length === 0) return new Response('Não encontrado.', { status: 404 })

  const pdf = await PDFDocument.create()
  const regular = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique)
  const W = 595
  const H = 842
  const M = 56
  const width = W - M * 2
  let sheet = pdf.addPage([W, H])
  let y = H - M

  const footer = (target: typeof sheet) => target.drawText(pdfSafe('twisisa.site · Percebe a matéria. Não decores.'), { x: M, y: 28, size: 8, font: regular, color: rgb(0.45, 0.5, 0.45) })
  footer(sheet)
  const ensure = (needed: number) => {
    if (y - needed < M) {
      sheet = pdf.addPage([W, H])
      footer(sheet)
      y = H - M
    }
  }
  const paragraph = (text: string, font: typeof regular, size: number, color = rgb(0.12, 0.16, 0.13), gap = 4) => {
    const lines = wrapLines(pdfSafe(text), width, (value) => font.widthOfTextAtSize(value, size))
    for (const line of lines) {
      ensure(size + gap)
      if (line) sheet.drawText(line, { x: M, y: y - size, size, font, color })
      y -= size + gap
    }
  }

  paragraph(`Exame de admissão de ${page.subject.name} ${page.institution.shortName}`, bold, 18, rgb(0.07, 0.21, 0.16), 6)
  paragraph(`Os ${page.topics.length} temas principais a estudar`, regular, 12, rgb(0.35, 0.4, 0.35), 10)
  y -= 6
  for (const topic of page.topics) {
    ensure(70)
    paragraph(`${topic.position}. ${topic.title}`, bold, 13, rgb(0.07, 0.21, 0.16), 5)
    paragraph(topic.summary, regular, 10.5, undefined, 4)
    if (topic.tips) {
      y -= 2
      paragraph(`Dica: ${topic.tips}`, italic, 10, rgb(0.07, 0.3, 0.22), 4)
    }
    y -= 12
  }

  const saved = await pdf.save()
  // Cópia com memória própria: é o que o Response aceita como corpo.
  const body = new Uint8Array(saved.length)
  body.set(saved)
  const name = `temas-${page.subject.slug}-${page.institution.slug}.pdf`
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'private, no-store' },
  })
}
