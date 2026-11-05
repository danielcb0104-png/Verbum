import React, { useContext, useMemo, useState } from 'react'
import { Ctx } from './App.jsx'
import { refMarca, normaliza } from './util.js'

export default function Marcas({ libro }) {
  const { books, bookById, marcas } = useContext(Ctx)
  const [filtro, setFiltro] = useState('todas')
  const [q, setQ] = useState('')
  const orden = useMemo(() => Object.fromEntries(books.map((b, i) => [b.id, i])), [books])
  const lista = useMemo(() => {
    const nq = normaliza(q.trim())
    return marcas
      .filter(m => !libro || m.libro === libro)
      .filter(m => filtro === 'todas' || (filtro === 'notas' ? !!m.nota : m.color && m.color !== 'ninguno'))
      .filter(m => !nq || normaliza((m.texto || '') + ' ' + (m.nota || '')).includes(nq))
      .sort((a, b) => (orden[a.libro] - orden[b.libro]) || (a.cap - b.cap) || (a.v_ini - b.v_ini) || (a.off_ini - b.off_ini))
  }, [marcas, libro, filtro, q, orden])
  const porLibro = useMemo(() => {
    const g = []
    for (const m of lista) {
      if (!g.length || g[g.length - 1].id !== m.libro) g.push({ id: m.libro, items: [] })
      g[g.length - 1].items.push(m)
    }
    return g
  }, [lista])
  const resumen = useMemo(() => {
    const r = {}
    for (const m of marcas) { const x = (r[m.libro] ||= { m: 0, n: 0 }); if (m.color && m.color !== 'ninguno') x.m++; if (m.nota) x.n++ }
    return r
  }, [marcas])
  return (
    <main className="page">
      <header className="pagehead">
        <h1>{libro ? 'Marcas · ' + bookById[libro]?.name : 'Mis marcas y comentarios'}</h1>
        {libro && <a className="btn small" href="#/marcas">Todos los libros</a>}
      </header>
      {!libro && marcas.length > 0 && (
        <div className="resumen">
          {books.filter(b => resumen[b.id]).map(b => (
            <a key={b.id} href={`#/marcas/${b.id}`} className="rchip">
              <b>{b.abbr}</b>{resumen[b.id].m > 0 && <span className="pill m">{resumen[b.id].m}</span>}{resumen[b.id].n > 0 && <span className="pill n">{resumen[b.id].n}</span>}
            </a>
          ))}
        </div>
      )}
      <div className="filters">
        {[['todas', 'Todo'], ['marcas', 'Marcas'], ['notas', 'Comentarios']].map(([k, l]) => <button key={k} className={'chip' + (filtro === k ? ' on' : '')} onClick={() => setFiltro(k)}>{l}</button>)}
        <input className="search" type="search" placeholder="Buscar en mis notas…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {marcas.length === 0 && <div className="empty"><p>Aún no tienes marcas.</p><p className="muted">Mientras lees, selecciona un fragmento (o toca un versículo) y elige un color o «Comentar».</p></div>}
      {porLibro.map(g => (
        <section key={g.id} className="mgroup">
          <h2 className="grouphead">{bookById[g.id]?.name} <span className="muted">· {g.items.length}</span></h2>
          {g.items.map(m => (
            <a key={m.id} className={'mymark hlb-' + m.color} href={`#/l/${m.libro}/${m.cap}/${m.v_ini}`}>
              <span className="mref">{refMarca(bookById[m.libro], m)}</span>
              <span className="mtext">«{m.texto}»</span>
              {m.nota && <span className="mnote">{m.nota}</span>}
              <span className="mdate">{new Date(m.updated_at || m.created_at).toLocaleDateString('es-ES')}</span>
            </a>
          ))}
        </section>
      ))}
    </main>
  )
}
