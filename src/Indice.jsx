import React, { useContext, useMemo, useState, useEffect } from 'react'
import { Ctx } from './App.jsx'
import { go } from './util.js'
import { lastPos } from './store.js'

export default function Indice({ abierto }) {
  const { books, marcas } = useContext(Ctx)
  const [open, setOpen] = useState(abierto)
  useEffect(() => { setOpen(abierto) }, [abierto])
  const stats = useMemo(() => {
    const s = {}
    for (const m of marcas) {
      const b = (s[m.libro] ||= { marcas: 0, notas: 0, caps: {} })
      if (m.color && m.color !== 'ninguno') b.marcas++
      if (m.nota) b.notas++
      const c = (b.caps[m.cap] ||= { marcas: 0, notas: 0 })
      if (m.color && m.color !== 'ninguno') c.marcas++
      if (m.nota) c.notas++
    }
    return s
  }, [marcas])
  const last = lastPos.get()
  const lastBook = last && books.find(b => b.id === last.libro)
  const grupos = [['AT', 'Antiguo Testamento'], ['NT', 'Nuevo Testamento']]
  useEffect(() => {
    if (abierto) document.getElementById('b-' + abierto)?.scrollIntoView({ block: 'start' })
  }, [abierto])
  return (
    <main className="page">
      <header className="pagehead">
        <h1>Índice</h1>
        {lastBook && <button className="btn small" onClick={() => go(`#/l/${last.libro}/${last.cap}`)}>Seguir leyendo · {lastBook.abbr} {last.cap}</button>}
      </header>
      <p className="legend"><span className="dot amarillo" /> marcas <span className="dot nota" /> comentarios</p>
      {grupos.map(([t, titulo]) => (
        <section key={t}>
          <h2 className="grouphead">{titulo}</h2>
          <ul className="books">
            {books.filter(b => b.t === t).map(b => {
              const st = stats[b.id]
              const isOpen = open === b.id
              return (
                <li key={b.id} id={'b-' + b.id} className={isOpen ? 'open' : ''}>
                  <button className="bookrow" onClick={() => setOpen(isOpen ? null : b.id)} aria-expanded={isOpen}>
                    <span className="bname">{b.name}</span>
                    <span className="bmeta">
                      {st?.marcas > 0 && <span className="pill m" title="Marcas">{st.marcas}</span>}
                      {st?.notas > 0 && <span className="pill n" title="Comentarios">{st.notas}</span>}
                      <span className="nch">{b.ch.length} cap.</span>
                    </span>
                  </button>
                  {isOpen && (
                    <div className="chapters">
                      {b.ch.map((_, i) => {
                        const c = st?.caps[i + 1]
                        return (
                          <a key={i} href={`#/l/${b.id}/${i + 1}`} className={'ch' + (c ? ' has' : '')}>
                            {i + 1}
                            {c && <span className="chmarks">{c.marcas > 0 && <i className="dot amarillo" />}{c.notas > 0 && <i className="dot nota" />}</span>}
                          </a>
                        )
                      })}
                      {st && <a className="btn small ghost seeall" href={`#/marcas/${b.id}`}>Ver mis marcas en {b.name}</a>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </main>
  )
}
