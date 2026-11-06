import React, { useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Ctx, IconBack, IconNext, IconClose, IconNote, IconCopy, IconBook } from './App.jsx'
import * as S from './store.js'
import { COLORES, POESIA, go, offsetEn, keyV, refMarca } from './util.js'
import VerseSheet from './VerseSheet.jsx'
import MarkEditor from './MarkEditor.jsx'

export default function Reader({ route }) {
  const { bookById, marcas, corr, prefs, api, toast } = useContext(Ctx)
  const book = bookById[route.libro]
  const cap = route.cap
  const [nc, setNc] = useState(null)
  const [err, setErr] = useState(null)
  const [vul, setVul] = useState(null)
  const [pidx, setPidx] = useState(null)
  const [sel, setSel] = useState(null)        // {type:'verses', vs:Set} | {type:'text', r:{...}}
  const [sheet, setSheet] = useState(null)    // {v, tab}
  const [editor, setEditor] = useState(null)  // {mark} | {range}
  const [nota, setNota] = useState(null)      // nota NC abierta {v, t}
  const boxRef = useRef(null)

  useEffect(() => {
    if (!book) return
    setNc(null); setErr(null)
    S.loadNC(book.id).then(setNc).catch(e => setErr(e.message))
    S.loadPadresIndex().then(setPidx).catch(() => {})
    S.lastPos.set({ libro: book.id, cap })
  }, [book, cap])
  useEffect(() => { if (book && prefs.latin) S.loadVulgata(book.id).then(setVul).catch(() => {}) }, [book, prefs.latin])
  useEffect(() => {
    if (!nc || !route.vers) { window.scrollTo(0, 0); return }
    const el = document.getElementById('v' + route.vers)
    if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 2200) }
  }, [nc, route.vers])

  const verses = nc?.chapters[cap - 1] || []
  const textOf = useCallback(v => corr[keyV(book.id, cap, v.v)] ?? v.t, [corr, book, cap])
  const capMarcas = useMemo(() => marcas.filter(m => m.libro === book?.id && m.cap === cap), [marcas, book, cap])
  const pcount = pidx?.[book?.id]?.[cap] || null
  const textRef = useRef(null)
  textRef.current = n => { const v = verses.find(x => x.v === n); return v ? textOf(v) : '' }

  // --------- selección de texto ---------
  useEffect(() => {
    let t
    const onSel = () => {
      clearTimeout(t)
      t = setTimeout(() => {
        const s = window.getSelection()
        if (!s || s.isCollapsed || !boxRef.current) {
          setSel(x => (x?.type === 'text' ? null : x)); return
        }
        const r = s.getRangeAt(0)
        if (!boxRef.current.contains(r.commonAncestorContainer)) return
        const rr = rangeToMarca(r, boxRef.current)
        if (rr) setSel({ type: 'text', r: ajustaPalabras(rr, textRef.current) })
      }, 200)
    }
    document.addEventListener('selectionchange', onSel)
    return () => { document.removeEventListener('selectionchange', onSel); clearTimeout(t) }
  }, [])

  function onTextClick(e, v) {
    const s = window.getSelection()
    if (s && !s.isCollapsed) return
    const nb = e.target.closest('[data-nota]')
    if (nb) { const n = verses.find(x => x.v === v.v)?.n?.[+nb.dataset.nota]; if (n) setNota({ v: v.v, t: n.t }); return }
    const um = e.target.closest('[data-um]')
    if (um) { const m = marcas.find(x => x.id === um.dataset.um); if (m) { setEditor({ mark: m }); return } }
    const hl = e.target.closest('[data-mid]')
    if (hl) { const m = marcas.find(x => x.id === hl.dataset.mid); if (m) { setEditor({ mark: m }); return } }
    setSel(x => {
      const vs = new Set(x?.type === 'verses' ? x.vs : [])
      vs.has(v.v) ? vs.delete(v.v) : vs.add(v.v)
      return vs.size ? { type: 'verses', vs } : null
    })
  }

  function selRange() {
    if (!sel) return null
    if (sel.type === 'text') return sel.r
    const vs = [...sel.vs].sort((a, b) => a - b)
    const last = verses.find(x => x.v === vs[vs.length - 1])
    const txt = vs.map(n => textOf(verses.find(x => x.v === n))).join(' ')
    return { v_ini: vs[0], off_ini: 0, v_fin: vs[vs.length - 1], off_fin: textOf(last).length, texto: txt }
  }
  async function marcar(color) {
    const r = selRange(); if (!r) return
    try {
      await api.add({ libro: book.id, cap, ...r, color, nota: null })
      window.getSelection()?.removeAllRanges(); setSel(null)
    } catch (e) { toast('No se pudo guardar: ' + e.message) }
  }
  function comentar() {
    const r = selRange(); if (!r) return
    setEditor({ range: r }); window.getSelection()?.removeAllRanges(); setSel(null)
  }
  async function copiar() {
    const r = selRange(); if (!r) return
    const ref = refMarca(book, { cap, v_ini: r.v_ini, v_fin: r.v_fin })
    try { await navigator.clipboard.writeText(`«${r.texto}» (${ref}, Biblia de Navarra)`); toast('Copiado') } catch { toast('No se pudo copiar') }
    window.getSelection()?.removeAllRanges(); setSel(null)
  }

  if (!book) return <main className="page"><p>Libro no encontrado.</p><a href="#/">Volver al índice</a></main>
  const prev = cap > 1 ? `#/l/${book.id}/${cap - 1}` : null
  const next = cap < book.ch.length ? `#/l/${book.id}/${cap + 1}` : null
  const poesia = POESIA.has(book.id)
  const blocks = prefs.latin || poesia

  return (
    <div className="reader">
      <header className="readhead">
        <a href={`#/libro/${book.id}`} className="iconbtn" aria-label="Índice"><IconBook /></a>
        <a href={`#/libro/${book.id}`} className="readtitle">{book.name} <b>{cap}</b></a>
        <span className="spacer" />
        {prev ? <a href={prev} className="iconbtn" aria-label="Capítulo anterior"><IconBack /></a> : <span className="iconbtn off" />}
        {next ? <a href={next} className="iconbtn" aria-label="Capítulo siguiente"><IconNext /></a> : <span className="iconbtn off" />}
      </header>

      <main className={'text' + (blocks ? ' blocks' : '')} ref={boxRef}>
        {err && <div className="error">{err}<br /><button className="btn small" onClick={() => location.reload()}>Reintentar</button></div>}
        {!nc && !err && <div className="loading">Cargando {book.name}…</div>}
        {nc && <h2 className="chaphead">{cap === 1 ? book.name : (book.id === 'sal' ? 'Salmo' : 'Capítulo')} {book.id === 'sal' || cap > 1 ? cap : ''}</h2>}
        {verses.map(v => (
          <React.Fragment key={v.v}>
            {v.h && v.h.map((h, i) => <h3 key={i} className="vhead">{h}</h3>)}
            <span id={'v' + v.v} className={'verse' + (sel?.type === 'verses' && sel.vs.has(v.v) ? ' selected' : '')}>
              <button className={'vn' + ((v.n && v.n.length) || (pcount && hasPadres(pidx, book.id, cap, v)) ? ' pp' : '')} onClick={() => setSheet({ v: v.v })} aria-label={`Versículo ${v.l || v.v}: comentarios y Vulgata`}>
                {v.l || (v.v2 ? `${v.v}-${v.v2}` : v.v)}
              </button>
              <span className="vt" data-v={v.v} onClick={e => onTextClick(e, v)}>
                <VerseText text={textOf(v)} v={v} marcas={capMarcas} notasNC={false} poesia={poesia} />
              </span>
              {prefs.latin && vul && <span className="lat" lang="la">{Array.from({ length: (v.v2 || v.v) - v.v + 1 }, (_, i) => vul[cap - 1]?.[v.v + i]).filter(Boolean).join(' ')}</span>}
              {' '}
            </span>
          </React.Fragment>
        ))}
        {nc && (
          <nav className="chapnav">
            {prev ? <a className="btn" href={prev}>‹ {book.abbr} {cap - 1}</a> : <span />}
            {next ? <a className="btn" href={next}>{book.abbr} {cap + 1} ›</a> : <span />}
          </nav>
        )}
      </main>

      {sel && !editor && !sheet && (
        <div className="actionbar" role="toolbar" aria-label="Acciones de selección">
          <div className="colors">
            {COLORES.map(c => <button key={c.id} className={'sw ' + c.id} title={c.nombre} aria-label={'Marcar en ' + c.nombre} onMouseDown={e => e.preventDefault()} onClick={() => marcar(c.id)} />)}
          </div>
          <div className="acts">
            <button onMouseDown={e => e.preventDefault()} onClick={comentar}><IconNote /> Comentar</button>
            {sel.type === 'verses' && <button onClick={() => { setSheet({ v: Math.min(...sel.vs) }); setSel(null) }}>Estudiar</button>}
            <button onMouseDown={e => e.preventDefault()} onClick={copiar}><IconCopy /> Copiar</button>
            <button className="x" aria-label="Cancelar" onClick={() => { window.getSelection()?.removeAllRanges(); setSel(null) }}><IconClose /></button>
          </div>
        </div>
      )}

      {sheet && <VerseSheet book={book} cap={cap} verse={verses.find(x => x.v === sheet.v)} text={textOf(verses.find(x => x.v === sheet.v))} onClose={() => setSheet(null)} onEditMark={m => { setSheet(null); setEditor({ mark: m }) }} />}
      {editor && <MarkEditor book={book} cap={cap} {...editor} onClose={() => setEditor(null)} />}
      {nota && (
        <div className="sheet-backdrop" onClick={() => setNota(null)}>
          <div className="popnote" onClick={e => e.stopPropagation()}>
            <div className="popnote-h">Nota de Nácar-Colunga · {book.abbr} {cap},{nota.v}<button className="iconbtn" onClick={() => setNota(null)} aria-label="Cerrar"><IconClose /></button></div>
            <p>{nota.t}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function hasPadres(pidx, id, cap, v) {
  const m = pidx?.[id]?.[cap]
  if (!m || typeof m !== 'object') return !!m
  for (let k = v.v; k <= (v.v2 || v.v); k++) if (m[k]) return true
  return false
}

// Amplía la selección a palabras completas y obtiene el texto citado
function ajustaPalabras(rr, getText) {
  const W = /[\p{L}\p{N}]/u
  let { v_ini, off_ini, v_fin, off_fin } = rr
  const ta = getText(v_ini), tb = getText(v_fin)
  while (off_ini > 0 && W.test(ta[off_ini - 1]) && W.test(ta[off_ini] || '')) off_ini--
  while (off_ini < ta.length && /\s/.test(ta[off_ini])) off_ini++
  while (off_fin < tb.length && W.test(tb[off_fin]) && off_fin > 0 && W.test(tb[off_fin - 1])) off_fin++
  while (off_fin > 0 && /\s/.test(tb[off_fin - 1])) off_fin--
  const partes = []
  for (let v = v_ini; v <= v_fin; v++) {
    const t = getText(v)
    partes.push(t.slice(v === v_ini ? off_ini : 0, v === v_fin ? off_fin : t.length))
  }
  return { v_ini, off_ini, v_fin, off_fin, texto: partes.join(' ').replace(/\s*\|\s*/g, ' / ').replace(/\s+/g, ' ').trim() }
}

// Convierte un Range del DOM en {v_ini, off_ini, v_fin, off_fin}
function rangeToMarca(r, root) {
  const vts = [...root.querySelectorAll('.vt')]
  const findVt = (node, isStart) => {
    const el = node.nodeType === 1 ? node : node.parentElement
    const vt = el?.closest('.vt')
    if (vt) return { vt, node, off: null }
    // el punto cae fuera de un texto (p. ej. en el número de versículo)
    const verse = el?.closest('.verse')
    if (verse) { const t = verse.querySelector('.vt'); return { vt: t, edge: isStart ? 'start' : 'end' } }
    return null
  }
  let a = findVt(r.startContainer, true), b = findVt(r.endContainer, false)
  if (!a || !b) {
    const inR = vts.filter(vt => r.intersectsNode(vt))
    if (!inR.length) return null
    a = a || { vt: inR[0], edge: 'start' }; b = b || { vt: inR[inR.length - 1], edge: 'end' }
  }
  const len = vt => offsetEn(vt, vt, vt.childNodes.length)
  const offA = a.edge === 'start' ? 0 : a.edge === 'end' ? len(a.vt) : offsetEn(a.vt, r.startContainer, r.startOffset)
  const offB = b.edge === 'end' ? len(b.vt) : b.edge === 'start' ? 0 : offsetEn(b.vt, r.endContainer, r.endOffset)
  if (offA == null || offB == null) return null
  const va = +a.vt.dataset.v, vb = +b.vt.dataset.v
  if (va === vb && offA === offB) return null
  return { v_ini: va, off_ini: offA, v_fin: vb, off_fin: offB }
}

// Texto del versículo con marcas, notas y saltos de verso
const VerseText = React.memo(function VerseText({ text, v, marcas, notasNC, poesia }) {
  const L = text.length
  const ms = marcas.filter(m => m.v_ini <= v.v && m.v_fin >= v.v)
    .map(m => ({ m, a: m.v_ini === v.v ? Math.min(m.off_ini, L) : 0, b: m.v_fin === v.v ? Math.min(m.off_fin, L) : L }))
    .filter(x => x.b > x.a || (x.m.nota && x.m.v_fin === v.v))
  const seps = []
  if (poesia) { let i = -1; while ((i = text.indexOf(' | ', i + 1)) !== -1) seps.push([i, i + 3]) }
  const notes = notasNC && v.n ? v.n.map((n, i) => ({ at: Math.min(n.at, L), i })) : []
  const cuts = new Set([0, L])
  ms.forEach(x => { cuts.add(x.a); cuts.add(x.b) })
  seps.forEach(([a, b]) => { cuts.add(a); cuts.add(b) })
  notes.forEach(n => cuts.add(n.at))
  const pts = [...cuts].filter(x => x >= 0 && x <= L).sort((a, b) => a - b)
  const out = []
  const endNotes = (pos, key) => {
    notes.filter(n => n.at === pos).forEach(n => out.push(<button key={key + 'n' + n.i} className="ncnote" data-skip="" data-nota={n.i} contentEditable={false} aria-label="Nota de Nácar-Colunga">*</button>))
    ms.filter(x => x.b === pos && x.m.nota).forEach(x => out.push(<button key={key + 'u' + x.m.id} className="umark" data-skip="" data-um={x.m.id} contentEditable={false} aria-label="Ver comentario"><IconNote /></button>))
  }
  endNotes(0, 's')
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k], b = pts[k + 1]
    if (b <= a) continue
    const sep = seps.find(([x, y]) => a >= x && b <= y)
    if (sep) out.push(<span key={k} className="sep" data-len={b - a} />)
    else {
      const cov = ms.filter(x => x.a <= a && x.b >= b && x.b > x.a)
      const top = cov[cov.length - 1]
      const cls = cov.map(x => x.m.color ? 'hl-' + x.m.color : '').concat(cov.some(x => x.m.nota) ? ['hasnote'] : []).join(' ')
      out.push(cov.length ? <span key={k} className={'hl ' + cls} data-mid={top.m.id}>{text.slice(a, b)}</span> : <React.Fragment key={k}>{text.slice(a, b)}</React.Fragment>)
    }
    endNotes(b, 'e' + k)
  }
  return out
})
