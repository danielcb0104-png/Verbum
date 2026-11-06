import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Ctx, IconClose } from './App.jsx'
import * as S from './store.js'
import { siglo } from './autores.js'
import { refMarca } from './util.js'

export default function VerseSheet({ book, cap, verse, text, onClose }) {
  const { prefs, setPrefs, marcas, api, toast, corr } = useContext(Ctx)
  const [tab, setTab] = useState('padres')
  const [vul, setVul] = useState(null)
  const [pad, setPad] = useState(null)
  const [aut, setAut] = useState({})
  const [padErr, setPadErr] = useState(null)
  const [st, setSt] = useState(null)
  const [pp, setPp] = useState(null)
  const v1 = verse.v, v2 = verse.v2 || verse.v
  useEffect(() => {
    S.loadVulgata(book.id).then(setVul).catch(() => setVul([]))
    S.loadAutores().then(setAut).catch(() => {})
    S.loadPadres(book.id, cap).then(setPad).catch(e => { setPad([]); setPadErr(e.message) })
    S.loadStraub(book.id, cap).then(setSt).catch(() => setSt([]))
    S.loadPapas(book.id).then(setPp).catch(() => setPp([]))
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

  const listaPp = useMemo(() => {
    if (!pp) return null
    const k = (c, v) => c * 1000 + v
    return pp.filter(e => k(e.s[0], e.s[1]) <= k(cap, v2) && k(e.e[0], e.e[1]) >= k(cap, v1))
      .sort((x, y) => x.d < y.d ? -1 : 1)
  }, [pp, cap, v1, v2])
  const listaSt = useMemo(() => st ? st.filter(e => e.v >= v1 && e.v <= v2) : null, [st, v1, v2])
  const misMarcas = marcas.filter(m => m.nota && m.libro === book.id && m.cap === cap && m.v_ini <= v2 && m.v_fin >= v1)
  const latin = vul ? Array.from({ length: v2 - v1 + 1 }, (_, i) => vul[cap - 1]?.[v1 + i]).filter(Boolean).join(' ') : null
  const ref = `${book.abbr} ${cap},${verse.l || v1}${v2 > v1 ? '-' + v2 : ''}`
  const notas = verse.n || []
  const nCom = notas.length + (lista ? lista.length : 0) + (listaSt ? listaSt.length : 0) + (listaPp ? listaPp.length : 0)
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
            ['mias', `Mis notas${misMarcas.length ? ' (' + misMarcas.length + ')' : ''}`]
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
              <p className="subtit">Juan Straubinger (1883-1956), sacerdote y biblista alemán que, huyendo del nazismo, se estableció en Argentina, donde tradujo toda la Biblia al castellano desde las lenguas originales. Estas notas proceden de su Biblia comentada (la «Biblia Platense», publicada en Argentina a mediados del siglo XX), hoy de dominio público.</p>
              {listaSt === null && <p className="muted">Cargando…</p>}
              {listaSt && listaSt.length === 0 && <p className="muted">Sin nota para este versículo.</p>}
              {listaSt && listaSt.map((e, i) => <NotaSt key={i} e={e} />)}
              <h4 className="secc">Santos Padres</h4>
              <p className="subtit">De la Catena Aurea, obra que Santo Tomás de Aquino compuso hacia 1262-1264 por encargo del papa Urbano IV: para cada pasaje de los cuatro Evangelios reúne, encadenados, textos de los Padres griegos y latinos. Traducción castellana publicada en mercaba.org.</p>
              {hayCatena && <label className="toggle"><input type="checkbox" checked={prefs.medievales} onChange={e => setPrefs({ ...prefs, medievales: e.target.checked })} /> Incluir también a los comentaristas medievales (Teofilacto, Rábano, Glosa…)</label>}
              {lista === null && <p className="muted">Cargando comentarios…</p>}
              {padErr && <p className="error">{padErr}</p>}
              {lista && lista.length === 0 && <p className="muted">Sin nota para este versículo.</p>}
              {lista && lista.map((e, i) => <Comentario key={i} e={e} a={aut[e.a]} />)}
              <h4 className="secc">Comentarios papales</h4>
              <p className="subtit">Catequesis de San Juan Pablo II y Benedicto XVI sobre los salmos y cánticos de Laudes y Vísperas (2001-2006), y alocuciones del Ángelus y Regina Caeli de Benedicto XVI y Francisco sobre el Evangelio del domingo. Textos oficiales en castellano de la Santa Sede (vatican.va). En las catequesis, los salmos se citan con la numeración litúrgica, que a menudo es uno menos que la de esta Biblia.</p>
              {listaPp === null && <p className="muted">Cargando…</p>}
              {listaPp && listaPp.length === 0 && <p className="muted">Sin comentario para este versículo.</p>}
              {listaPp && listaPp.map((e, i) => <ComentarioPapa key={i} e={e} book={book} />)}

            </div>
          )}
          {tab === 'mias' && <MisNotas book={book} cap={cap} v1={v1} v2={v2} text={text} notas={misMarcas} />}
        </div>
      </section>
    </div>
  )
}

const MESES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
function ComentarioPapa({ e, book }) {
  const [abierto, setAbierto] = useState(false)
  const [y, m, d] = e.d.split('-').map(Number)
  const r = e.s[0] === e.e[0] ? (e.s[1] === e.e[1] ? `${e.s[0]},${e.s[1]}` : `${e.s[0]},${e.s[1]}-${e.e[1]}`) : `${e.s[0]},${e.s[1]}–${e.e[0]},${e.e[1]}`
  return (
    <article className="coment papa">
      <header><span className="autor">{e.p}</span><span className="anio">{e.k}, {d}-{MESES[m - 1]}-{y}</span></header>
      <div className="ptit">{e.t || 'Comentario al Evangelio del día'} <span className="muted small">({book.abbr} {r})</span></div>
      <div className={'q' + (abierto ? '' : ' cut')} lang="es">{e.q}</div>
      <footer>
        {!abierto && <button className="link" onClick={() => setAbierto(true)}>Leer completo</button>}
        <a className="link small" href={e.u} target="_blank" rel="noopener">Ver en vatican.va</a>
      </footer>
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

function MisNotas({ book, cap, v1, v2, text, notas }) {
  const { api, toast } = useContext(Ctx)
  const [edit, setEdit] = useState(null)   // id de la nota que se edita, o 'nueva'
  const [txt, setTxt] = useState('')
  const [busy, setBusy] = useState(false)
  const abrir = (id, t) => { setEdit(id); setTxt(t) }
  async function guardar(m) {
    const t = txt.trim(); if (!t) return
    setBusy(true)
    try {
      if (m) await api.update(m.id, { nota: t })
      else await api.add({ libro: book.id, cap, v_ini: v1, off_ini: 0, v_fin: v2, off_fin: text.length, texto: text, color: 'ninguno', nota: t })
      setEdit(null)
    } catch (e) { toast('No se pudo guardar: ' + e.message) } finally { setBusy(false) }
  }
  async function borrar(m) {
    if (!confirm('¿Eliminar esta nota?')) return
    setBusy(true)
    try {
      if (m.color && m.color !== 'ninguno') await api.update(m.id, { nota: null })
      else await api.remove(m.id)
      setEdit(null)
    } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  const editor = m => (
    <div className="notaedit">
      <textarea value={txt} onChange={e => setTxt(e.target.value)} rows={5} autoFocus placeholder="Escribe aquí tu reflexión, una referencia, una idea para la oración…" />
      <div className="row">
        <button className="btn primary" onClick={() => guardar(m)} disabled={busy || !txt.trim()}>Guardar</button>
        {m && <button className="btn danger" onClick={() => borrar(m)} disabled={busy}>Eliminar</button>}
        <button className="btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
      </div>
    </div>
  )
  return (
    <div>
      {notas.length === 0 && edit !== 'nueva' && <p className="muted">No tienes notas en este versículo.</p>}
      {notas.map(m => edit === m.id ? (
        <div key={m.id} className={'mymark hlb-' + m.color}>
          {m.texto !== text && <span className="mtext">«{m.texto}»</span>}
          {editor(m)}
        </div>
      ) : (
        <button key={m.id} className={'mymark hlb-' + m.color} onClick={() => abrir(m.id, m.nota)}>
          {m.texto !== text && <span className="mtext">«{m.texto}»</span>}
          <span className="mnote">{m.nota}</span>
        </button>
      ))}
      {edit === 'nueva' ? <div className="mymark">{editor(null)}</div>
        : <button className="btn" style={{ marginTop: 8 }} onClick={() => abrir('nueva', '')}>+ Nueva nota</button>}
    </div>
  )
}
