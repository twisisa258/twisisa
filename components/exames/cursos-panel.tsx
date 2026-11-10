'use client'

import { useId, useState } from 'react'
import { Search } from 'lucide-react'
import { searchCourses, type CourseGroup } from '@/lib/exames-ui'

// Cursos que pedem a disciplina: pesquisa por curso ou faculdade, e uma barra por faculdade proporcional ao número de cursos.
export function CursosPanel({ subject, groups }: { subject: string; groups: CourseGroup[] }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const total = groups.reduce((sum, group) => sum + group.names.length, 0)
  const max = Math.max(1, ...groups.map((group) => group.names.length))
  const found = searchCourses(groups, query)
  const searching = query.trim() !== ''
  const single = groups.length === 1

  let hint = single ? `${total} ${total === 1 ? 'curso pede' : 'cursos pedem'} ${subject}.` : `${total} cursos em ${groups.length} faculdades. Toca numa para ver os cursos.`
  if (searching) hint = found.length > 0 ? `Sim, ${found.length === 1 ? '1 curso pede' : `${found.length} cursos pedem`} ${subject}.` : ''

  return (
    <>
      <div className="ex2-q">
        <label htmlFor={id} className="ex2-sr">Procurar curso</label>
        <Search size={18} aria-hidden />
        <input id={id} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`O teu curso pede ${subject}?`} autoComplete="off" />
      </div>
      <p className="ex2-hint" aria-live="polite">{hint}</p>

      {searching ? (
        found.length > 0 ? (
          <div className="ex2-res">
            {found.map((item) => <div key={`${item.unit}-${item.name}`}>{item.name}{item.unit !== 'Outros cursos' && <small>{item.unit}</small>}</div>)}
          </div>
        ) : (
          <div className="ex2-vz">Nenhum curso com esse nome pede {subject}. Confirma o nome ou tenta outra palavra.</div>
        )
      ) : single ? (
        <div className="ex2-cl ex2-solo">{groups[0].names.map((name) => <span key={name}>{name}</span>)}</div>
      ) : (
        <div className="ex2-fu">
          {groups.map((group) => (
            <details key={group.unit}>
              <summary>
                <span className="nm">{group.unit}</span>
                <span className="ct">{group.names.length}</span>
                <span className="br" aria-hidden="true"><i style={{ '--w': `${Math.round((group.names.length / max) * 100)}%` } as React.CSSProperties} /></span>
              </summary>
              <div className="ex2-cl">{group.names.map((name) => <span key={name}>{name}</span>)}</div>
            </details>
          ))}
        </div>
      )}
    </>
  )
}
