import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Ctx, IconClose } from './App.jsx'
import * as S from './store.js'
import { siglo } from './autores.js'
import { refMarca } from './util.js'

export default function VerseSheet({ book, cap, verse, text, onClose, onEditMark }) {
  const { prefs, setPrefs, marcas, api, toast, corr } = useContext(Ctx)
  const [tab, setTab] = useState('padres')
  const [vul, setVul] = useState(null)
  const [pad, setPad] = useState(null)
  const [aut, setAut] = useState({})
  const [padErr, setPadErr] = useState(null)
  const [st, setSt] = useState(null)
  const [cb, setCb] = useState(null)
  const v1 = verse.v, v2 = verse.v2 || verse.v
  useEffect(() => {
    S.loadVulgata(book.id).then(setVul).catch(() => setVul([]))
    S.loadAutores().then(setAut).catch(() => {})
    S.loadPadres(book.id, cap).then(setPad).catch(e => { setPad([]); setPadErr(e.message) })
    S.loadStraub(book.id, cap).then(setSt).catch(() => setSt([]))
    S.loadCbsj(book.id, cap).then(setCb).catch(() => setCb([]))
  }, [book, cap])
  useEffect(() => {
    const k = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const lista = useMemo(() => {
    if (!pad) return null
    const inRange = e => {
      const a = e.s[0] * 1000 + e.s[1], z = e.e[0] * 1000 + e.e[1]
      return a <= cap * 1000 + v2 && z >= cap * 1000 + v1
    }
    // se conserva el orden de la Catena Aurea
    return pad.filter(inRange).filter(e => prefs.medievales || (aut[e.a]?.g !== 'M'))
  }, [pad, prefs.medievales, aut, cap, v1, v2])

  const listaCb = useMemo(() => {
    if (!cb) return null
    const k = (c, v) => c * 1000 + v
    return cb.filter(e => k(e.s[0], e.s[1]) <= k(cap, v2) && k(e.e[0], e.e[1]) >= k(cap, v1))
      .sort((x, y) => (k(x.e[0], x.e[1]) - k(x.s[0], x.s[1])) - (k(y.e[0], y.e[1]) - k(y.s[0], y.s[1])))
  }, [cb, cap, v1, v2])
  const listaSt = useMemo(() => st ? st.filter(e => e.v >= v1 && e.v <= v2) : null, [st, v1, v2])
  const misMarcas = marcas.filter(m => m.libro === book.id && m.cap === cap && m.v_ini <= v2 && m.v_fin >= v1)
  const latin = vul ? Array.from({ length: v2 - v1 + 1 }, (_, i) => vul[cap - 1]?.[v1 + i]).filter(Boolean).join(' ') : null
  const ref = `${book.abbr} ${cap},${verse.l || v1}${v2 > v1 ? '-' + v2 : ''}`
  const notas = verse.n || []
  const nCom = notas.length + (lista ? lista.length : 0) + (listaSt ? listaSt.length : 0) + (listaCb ? listaCb.length : 0)
  const hayCatena = ['mat', 'mar', 'luc', 'jua'].includes(book.id)

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet" role="dialog" aria-label={'Versículo ' + ref} onClick={e => e.stopPropagation()}>
        <div className="grab" />
        <header className="sheethead">
          <div>
            <div className="sref">{ref}</div>
            <p className="squote">{text}</p>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar"><IconClose /></button>
        </header>
        <div className="tabs" role="tablist">
          {[
            ['padres', `Comentarios${lista ? ' (' + nCom + ')' : ''}`],
            ['latin', 'Vulgata'],
            ['mias', `Mías${misMarcas.length ? ' (' + misMarcas.length + ')' : ''}`]
          ].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        <div className="sheetbody">
          {tab === 'latin' && (
            <div className="latin">
              {latin === null ? <p className="muted">Cargando…</p> : latin ? <p lang="la">{latin}</p> : <p className="muted">No hay texto latino para este versículo.</p>}
              <p className="fuente">Nova Vulgata, edición oficial latina de la Iglesia (vatican.va).</p>
            </div>
          )}
          {tab === 'padres' && (
            <div className="padres">
              {notas.length > 0 && <h4 className="secc">Notas de Nácar-Colunga</h4>}
              {notas.map((n, i) => <p key={i} className="ncnotefull">{n.t}</p>)}
              <h4 className="secc">Notas de Mons. Straubinger</h4>
              {listaSt === null && <p className="muted">Cargando…</p>}
              {listaSt && listaSt.length === 0 && <p className="muted">Sin nota para este versículo.</p>}
              {listaSt && listaSt.map((e, i) => <NotaSt key={i} e={e} />)}
              <h4 className="secc">Santos Padres</h4>
              {hayCatena && <label className="toggle"><input type="checkbox" checked={prefs.medievales} onChange={e => setPrefs({ ...prefs, medievales: e.target.checked })} /> Incluir también a los comentaristas medievales (Teofilacto, Rábano, Glosa…)</label>}
              {lista === null && <p className="muted">Cargando comentarios…</p>}
              {padErr && <p className="error">{padErr}</p>}
              {lista && lista.length === 0 && <p className="muted">{hayCatena ? 'No hay comentarios de los Padres para este versículo en la Catena Aurea.' : 'De momento solo hay comentarios de los Padres en castellano para los cuatro Evangelios (Catena Aurea). Iremos añadiendo más libros.'}</p>}
              {lista && lista.map((e, i) => <Comentario key={i} e={e} a={aut[e.a]} />)}
              <p className="fuente">Notas: La Sagrada Biblia, traducción y comentario de Mons. Juan Straubinger (1948).</p>
              <h4 className="secc">Comentario bíblico «San Jerónimo»</h4>
              {listaCb === null && <p className="muted">Cargando…</p>}
              {listaCb && listaCb.length === 0 && <p className="muted">Sin comentario para este versículo.</p>}
              {listaCb && listaCb.map((e, i) => <ComentarioCb key={i} e={e} />)}
              {listaCb && listaCb.length > 0 && <p className="fuente">Comentario bíblico «San Jerónimo», dir. R. E. Brown, J. A. Fitzmyer y R. E. Murphy (Cristiandad, 1971-1972), a partir del escaneo de Internet Archive.</p>}
              {lista && lista.length > 0 && <p className="fuente">Catena Aurea de Santo Tomás de Aquino: comentarios de los Santos Padres a los Evangelios, en traducción castellana (texto de mercaba.org).</p>}

            </div>
          )}
          {tab === 'mias' && (
            <div>
              {misMarcas.length === 0 && <p className="muted">No tienes marcas ni comentarios en este versículo. Selecciona texto o toca el versículo para marcarlo.</p>}
              {misMarcas.map(m => (
                <button key={m.id} className={'mymark hlb-' + m.color} onClick={() => onEditMark(m)}>
                  <span className="mref">{refMarca(book, m)}</span>
                  <span className="mtext">«{m.texto}»</span>
                  {m.nota && <span className="mnote">{m.nota}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ComentarioCb({ e }) {
  const [abierto, setAbierto] = useState(e.q.length < 700)
  const r = e.s[0] === e.e[0] ? (e.s[1] === e.e[1] ? `${e.s[0]},${e.s[1]}` : `${e.s[0]},${e.s[1]}-${e.e[1]}`) : `${e.s[0]},${e.s[1]}–${e.e[0]},${e.e[1]}`
  return (
    <article className="coment">
      <header><span className="autor cb">{r}</span>{e.t && <span className="anio">{e.t}</span>}</header>
      <div className={'q' + (abierto ? '' : ' cut')} lang="es">{e.q}</div>
      {!abierto && <footer><button className="link" onClick={() => setAbierto(true)}>Leer completo</button></footer>}
    </article>
  )
}

function NotaSt({ e }) {
  const [abierto, setAbierto] = useState(e.t.length < 900)
  return (
    <article className="coment">
      <div className={'q' + (abierto ? '' : ' cut')} lang="es">{e.t}</div>
      {!abierto && <footer><button className="link" onClick={() => setAbierto(true)}>Leer completo</button></footer>}
    </article>
  )
}

function Comentario({ e, a }) {
  const [abierto, setAbierto] = useState(e.q.length < 900)
  const rango = e.pref ? 'Prefacio al evangelio' : (e.s[1] !== e.e[1] ? `sobre los vv. ${e.s[1]}-${e.e[1]}` : `sobre el v. ${e.s[1]}`)
  return (
    <article className="coment">
      <header>
        <span className="autor">{e.a}</span>
        {a?.g === 'M' && <span className="tag">medieval</span>}
        <span className="anio">{siglo(a?.y)}</span>
      </header>
      <div className="sobre">{rango}{e.t ? ' · ' + e.t : ''}</div>
      <div className={'q' + (abierto ? '' : ' cut')} lang="es">{e.q}</div>
      {!abierto && <footer><button className="link" onClick={() => setAbierto(true)}>Leer completo</button></footer>}
    </article>
  )
}
