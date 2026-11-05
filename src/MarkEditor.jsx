import React, { useContext, useState } from 'react'
import { Ctx, IconClose } from './App.jsx'
import { COLORES, refMarca } from './util.js'

export default function MarkEditor({ book, cap, mark, range, onClose }) {
  const { api, toast } = useContext(Ctx)
  const base = mark || { ...range, libro: book.id, cap }
  const [color, setColor] = useState(mark ? mark.color : 'ninguno')
  const [nota, setNota] = useState(mark?.nota || '')
  const [busy, setBusy] = useState(false)
  async function guardar() {
    setBusy(true)
    try {
      if (mark) await api.update(mark.id, { color, nota: nota.trim() || null })
      else await api.add({ libro: book.id, cap, v_ini: range.v_ini, off_ini: range.off_ini, v_fin: range.v_fin, off_fin: range.off_fin, texto: range.texto, color, nota: nota.trim() || null })
      onClose()
    } catch (e) { toast('No se pudo guardar: ' + e.message) } finally { setBusy(false) }
  }
  async function borrar() {
    if (!mark) return onClose()
    setBusy(true)
    try { await api.remove(mark.id); onClose() } catch (e) { toast(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="sheet editor" role="dialog" aria-label="Marca y comentario" onClick={e => e.stopPropagation()}>
        <div className="grab" />
        <header className="sheethead">
          <div>
            <div className="sref">{refMarca(book, base)}</div>
            <p className={'squote hlb-' + color}>«{base.texto}»</p>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Cerrar"><IconClose /></button>
        </header>
        <div className="sheetbody">
          <div className="colors big">
            <button className={'sw ninguno' + (color === 'ninguno' ? ' on' : '')} onClick={() => setColor('ninguno')} title="Sin color" aria-label="Sin color">∅</button>
            {COLORES.map(c => <button key={c.id} className={'sw ' + c.id + (color === c.id ? ' on' : '')} onClick={() => setColor(c.id)} title={c.nombre} aria-label={c.nombre} />)}
          </div>
          <label className="lbl">Tu comentario
            <textarea value={nota} onChange={e => setNota(e.target.value)} rows={6} placeholder="Escribe aquí tu reflexión, una referencia, una idea para la oración…" autoFocus={!mark} />
          </label>
          <div className="row">
            <button className="btn primary" onClick={guardar} disabled={busy || (color === 'ninguno' && !nota.trim())}>Guardar</button>
            {mark && <button className="btn danger" onClick={borrar} disabled={busy}>Eliminar</button>}
            <button className="btn ghost" onClick={onClose}>Cancelar</button>
          </div>
          {color === 'ninguno' && !nota.trim() && <p className="muted small">Elige un color o escribe un comentario.</p>}
        </div>
      </section>
    </div>
  )
}
