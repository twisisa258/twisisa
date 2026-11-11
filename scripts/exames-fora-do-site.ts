import { Pool } from 'pg'
import 'dotenv/config'

// Relatório só de leitura:  npx tsx scripts/exames-fora-do-site.ts
// 1) quantos exames publicados já têm texto para o Google; 2) exames aprovados que não aparecem no site (e porquê).
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const resumo = await pool.query(
    `SELECT count(*)::int AS publicados, count(*) FILTER (WHERE length(coalesce(mi.extracted_text, '')) > 400)::int AS com_texto
     FROM academic_materials m JOIN library_categories c ON c.id = m.category_id LEFT JOIN material_imports mi ON mi.material_id = m.id
     WHERE m.status = 'approved' AND c.slug = 'exames' AND m.mime_type = 'application/pdf'`,
  )
  const { publicados, com_texto: comTexto } = resumo.rows[0] as { publicados: number; com_texto: number }
  console.log(`\nExames aprovados: ${publicados} · com texto aproveitável: ${comTexto} · sem texto (só PDF): ${publicados - comTexto}`)

  const fora = await pool.query(
    `SELECT m.id, m.title, m.institution_name AS universidade, s.name AS disciplina,
       CASE WHEN s.id IS NULL THEN 'sem disciplina' WHEN NOT s.active THEN 'disciplina inativa' ELSE 'universidade não coincide com nenhuma ativa' END AS motivo
     FROM academic_materials m
     JOIN library_categories c ON c.id = m.category_id
     LEFT JOIN library_subjects s ON s.id = m.subject_id
     LEFT JOIN institutions i ON i.active AND lower(m.institution_name) IN (lower(i.short_name), lower(i.name))
     WHERE m.status = 'approved' AND c.slug = 'exames' AND m.mime_type = 'application/pdf'
       AND (i.id IS NULL OR s.id IS NULL OR NOT s.active)
     ORDER BY m.title`,
  )
  if (fora.rows.length === 0) console.log('Nenhum exame aprovado fica fora do site.\n')
  else {
    console.log(`\n${fora.rows.length} exame(s) aprovado(s) NÃO aparecem no site nem no sitemap:\n`)
    console.table(fora.rows)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
