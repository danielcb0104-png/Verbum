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
  const v1 = verse.v, v2 = verse.v2 || verse.v
  useEffect(() => {
    S.loadVulgata(book.id).then(setVul).catch(() => setVul([]))
    S.loadAutores().then(setAut).catch(() => {})
    S.loadPadres(book.id, cap).then(setPad).catch(e => { setPad([]); setPadErr(e.message) })
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

  const misMarcas = marcas.filter(m => m.libro === book.id && m.cap === cap && m.v_ini <= v2 && m.v_fin >= v1)
  const latin = vul ? Array.from({ length: v2 - v1 + 1 }, (_, i) => vul[cap - 1]?.[v1 + i]).filter(Boolean).join(' ') : null
  const ref = `${book.abbr} ${cap},${v1}${v2 > v1 ? '-' + v2 : ''}`
  const notas = verse.n || []
  const nCom = notas.length + (lista ? lista.length : 0)
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
            ['mias', `Mías${misMarcas.length ? ' (' + misMarcas.length + ')' : ''}`],
            ['corregir', 'Corregir']
          ].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        <div className="sheetbody">
          {tab === 'latin' && (
            <div className="latin">
              {latin === null ? <p className="muted">Cargando…</p> : latin ? <p lang="la">{latin}</p> : <p className="muted">No hay correspondencia directa en la Vulgata Clementina para este versículo (la numeración difiere).</p>}
              <p className="fuente">Biblia Sacra Vulgatae Editionis (Clementina, 1592).</p>
            </div>
          )}
          {tab === 'padres' && (
            <div className="padres">
              {notas.length > 0 && <h4 className="secc">Notas de Nácar-Colunga</h4>}
              {notas.map((n, i) => <p key={i} className="ncnotefull">{n.t}</p>)}
              <h4 className="secc">Santos Padres</h4>
              {hayCatena && <label className="toggle"><input type="checkbox" checked={prefs.medievales} onChange={e => setPrefs({ ...prefs, medievales: e.target.checked })} /> Incluir también a los comentaristas medievales (Teofilacto, Rábano, Glosa…)</label>}
              {lista === null && <p className="muted">Cargando comentarios…</p>}
              {padErr && <p className="error">{padErr}</p>}
              {lista && lista.length === 0 && <p className="muted">{hayCatena ? 'No hay comentarios de los Padres para este versículo en la Catena Aurea.' : 'De momento solo hay comentarios de los Padres en castellano para los cuatro Evangelios (Catena Aurea). Iremos añadiendo más libros.'}</p>}
              {lista && lista.map((e, i) => <Comentario key={i} e={e} a={aut[e.a]} />)}
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
          {tab === 'corregir' && <Corregir book={book} cap={cap} verse={verse} actual={corr} api={api} toast={toast} />}
        </div>
      </section>
    </div>
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

function Corregir({ book, cap, verse, actual, api, toast }) {
  const key = `${book.id}|${cap}|${verse.v}`
  const [t, setT] = useState(actual[key] ?? verse.t)
  const changed = actual[key] !== undefined
  return (
    <div className="corregir">
      <p className="muted">El texto procede del escaneo de la edición de 1944 y puede contener errores de reconocimiento. Corrígelo aquí; el cambio se guarda en tu cuenta.</p>
      <textarea value={t} onChange={e => setT(e.target.value)} rows={6} />
      <div className="row">
        <button className="btn primary" onClick={async () => { try { await api.corregir(book.id, cap, verse.v, t.trim() === verse.t ? null : t.trim()); toast('Corrección guardada') } catch (e) { toast(e.message) } }}>Guardar corrección</button>
        {changed && <button className="btn" onClick={async () => { await api.corregir(book.id, cap, verse.v, null); setT(verse.t); toast('Restaurado el texto original') }}>Restaurar original</button>}
      </div>
      <p className="muted small">Aviso: si el versículo ya tiene marcas a mitad de frase, corrige antes de marcar para que no se desplacen.</p>
    </div>
  )
}
