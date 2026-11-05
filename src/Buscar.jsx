import React, { useContext, useState } from 'react'
import { Ctx } from './App.jsx'
import * as S from './store.js'
import { normaliza, go } from './util.js'

export default function Buscar({ q0 }) {
  const { books } = useContext(Ctx)
  const [q, setQ] = useState(q0 || '')
  const [res, setRes] = useState(null)
  const [prog, setProg] = useState(null)
  const [ambito, setAmbito] = useState('todo')
  async function buscar(e) {
    e?.preventDefault()
    const nq = normaliza(q.trim())
    if (nq.length < 3) return
    const out = []
    let n = 0
    const lista = books.filter(b => ambito === 'todo' || b.t === ambito)
    for (const b of lista) {
      const d = await S.loadNC(b.id).catch(() => null)
      setProg(Math.round(++n / lista.length * 100))
      if (!d) continue
      d.chapters.forEach((ch, ci) => ch.forEach(v => {
        const t = normaliza(v.t)
        const i = t.indexOf(nq)
        if (i >= 0) out.push({ b, c: ci + 1, v: v.v, t: v.t, i, L: nq.length })
      }))
      if (out.length > 500) break
    }
    setRes(out); setProg(null)
  }
  return (
    <main className="page">
      <header className="pagehead"><h1>Buscar</h1></header>
      <form className="searchform" onSubmit={buscar}>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Palabra o frase (p. ej. «buen pastor»)" autoFocus />
        <button className="btn primary">Buscar</button>
      </form>
      <div className="filters">
        {[['todo', 'Toda la Biblia'], ['AT', 'Antiguo T.'], ['NT', 'Nuevo T.']].map(([k, l]) => <button key={k} className={'chip' + (ambito === k ? ' on' : '')} onClick={() => setAmbito(k)}>{l}</button>)}
      </div>
      {prog !== null && <p className="muted">Buscando… {prog}%</p>}
      {res && <p className="muted">{res.length > 500 ? 'Más de 500' : res.length} resultados</p>}
      <ul className="results">
        {res && res.slice(0, 500).map((r, k) => (
          <li key={k}><a href={`#/l/${r.b.id}/${r.c}/${r.v}`}>
            <span className="mref">{r.b.abbr} {r.c},{r.v}</span>
            <span>{r.t.slice(0, r.i)}<mark>{r.t.slice(r.i, r.i + r.L)}</mark>{r.t.slice(r.i + r.L)}</span>
          </a></li>
        ))}
      </ul>
    </main>
  )
}
