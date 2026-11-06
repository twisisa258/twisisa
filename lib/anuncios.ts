import { randomUUID } from 'node:crypto'
import { pool } from '@/lib/db'

// Anúncios para os estudantes. A tabela e as regras estão em database/migrations/0036_anuncios.sql.
// A leitura nunca deve deitar a página abaixo: quem a usa apanha o erro e segue sem anúncios.

export const ANUNCIO_TONS = ['novidade', 'info', 'evento', 'aviso'] as const
export type AnuncioTom = (typeof ANUNCIO_TONS)[number]
export const ANUNCIO_TOM_LABEL: Record<AnuncioTom, string> = { novidade: 'Novidade', info: 'Informação', evento: 'Evento', aviso: 'Aviso' }

export type Anuncio = {
  id: string
  title: string
  body: string | null
  tone: AnuncioTom
  featured: boolean
  ctaLabel: string | null
  ctaHref: string | null
}

export type AnuncioAdmin = Anuncio & { track: string | null; startsAt: Date; endsAt: Date | null; active: boolean; live: boolean }

export const isAnuncioTom = (value: unknown): value is AnuncioTom => ANUNCIO_TONS.some((tom) => tom === value)

type Linha = { id: string; title: string; body: string | null; tone: string; featured: boolean; cta_label: string | null; cta_href: string | null }
const toAnuncio = (row: Linha): Anuncio => ({
  id: row.id,
  title: row.title,
  body: row.body,
  tone: isAnuncioTom(row.tone) ? row.tone : 'info',
  featured: row.featured,
  ctaLabel: row.cta_label,
  ctaHref: row.cta_href,
})

/** Anúncios a mostrar agora a este percurso: ativos, dentro das datas, os destacados primeiro. */
export async function getAnunciosAtivos(track: string | null, limit = 3): Promise<Anuncio[]> {
  const result = await pool.query(
    `SELECT id, title, body, tone, featured, cta_label, cta_href
     FROM announcements
     WHERE active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now()) AND (track IS NULL OR track = $1)
     ORDER BY featured DESC, starts_at DESC
     LIMIT $2`,
    [track, limit],
  )
  return result.rows.map((row) => toAnuncio(row as Linha))
}

/** Lista completa para a administração. */
export async function listAnuncios(): Promise<AnuncioAdmin[]> {
  const result = await pool.query(
    `SELECT id, title, body, tone, featured, cta_label, cta_href, track, starts_at, ends_at, active,
            (active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())) AS live
     FROM announcements
     ORDER BY active DESC, starts_at DESC
     LIMIT 200`,
  )
  return result.rows.map((row) => ({ ...toAnuncio(row as Linha), track: row.track as string | null, startsAt: row.starts_at as Date, endsAt: row.ends_at as Date | null, active: row.active as boolean, live: row.live as boolean }))
}

export type AnuncioInput = { title: string; body: string; tone: string; featured: boolean; ctaLabel: string; ctaHref: string; track: string; endsOn: string }

export function newAnuncioId() {
  return randomUUID()
}

// [twisisa-ux] anúncio único para a página de detalhe. Só se estiver ativo e dentro das datas.
export async function getAnuncioAtivo(id: string): Promise<Anuncio | null> {
  const result = await pool.query(
    `SELECT id, title, body, tone, featured, cta_label, cta_href
     FROM announcements
     WHERE id = $1 AND active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
     LIMIT 1`,
    [id],
  )
  const row = result.rows[0] as Linha | undefined
  return row ? toAnuncio(row) : null
}
