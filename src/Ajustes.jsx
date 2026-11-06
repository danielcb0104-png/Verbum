import React, { useContext, useState } from 'react'
import { Ctx } from './App.jsx'
import * as S from './store.js'

export default function Ajustes() {
  const { prefs, setPrefs, session, books, marcas, toast } = useContext(Ctx)
  const [prog, setProg] = useState(null)
  const set = (k, v) => setPrefs({ ...prefs, [k]: v })
  async function descargarTodo() {
    let n = 0
    for (const b of books) {
      try { await S.loadNC(b.id); await S.loadVulgata(b.id) } catch (e) { toast(e.message); break }
      setProg(Math.round(++n / books.length * 100))
    }
    toast('Biblia guardada para leer sin conexión')
  }
  function exportar() {
    const blob = new Blob([JSON.stringify(marcas, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mis-marcas-biblia.json'; a.click()
  }
  return (
    <main className="page">
      <header className="pagehead"><h1>Ajustes</h1></header>
      <section className="card">
        <h2>Lectura</h2>
        <div className="setrow"><span>Tamaño de letra</span>
          <div className="stepper">
            <button onClick={() => set('font', Math.max(14, prefs.font - 1))} aria-label="Reducir">A−</button>
            <span>{prefs.font}</span>
            <button onClick={() => set('font', Math.min(30, prefs.font + 1))} aria-label="Aumentar">A+</button>
          </div>
        </div>
        <div className="setrow"><span>Tema</span>
          <div className="seg">
            {[['claro', 'Claro'], ['sepia', 'Sepia'], ['oscuro', 'Oscuro']].map(([k, l]) => <button key={k} className={prefs.tema === k ? 'on' : ''} onClick={() => set('tema', k)}>{l}</button>)}
          </div>
        </div>
        <label className="setrow"><span>Mostrar la Vulgata bajo cada versículo</span><input type="checkbox" checked={prefs.latin} onChange={e => set('latin', e.target.checked)} /></label>
        <label className="setrow"><span>Incluir comentaristas medievales en la Catena Aurea</span><input type="checkbox" checked={prefs.medievales} onChange={e => set('medievales', e.target.checked)} /></label>
      </section>
      <section className="card">
        <h2>Sin conexión</h2>
        <p className="muted">Descarga los 73 libros (≈4 MB) para leer sin internet. Los comentarios se guardan a medida que los consultas.</p>
        <button className="btn" onClick={descargarTodo} disabled={prog !== null && prog < 100}>{prog === null ? 'Descargar toda la Biblia' : prog < 100 ? `Descargando… ${prog}%` : 'Descargada ✓'}</button>
      </section>
      <section className="card">
        <h2>Cuenta</h2>
        <p className="muted">{S.LOCAL ? 'Modo local (sin Supabase): las marcas se guardan solo en este navegador.' : 'Sesión: ' + session?.user?.email}</p>
        <div className="row">
          <button className="btn" onClick={exportar}>Exportar mis marcas (JSON)</button>
          {!S.LOCAL && <button className="btn danger" onClick={() => S.signOut()}>Cerrar sesión</button>}
        </div>
      </section>
      <section className="card about">
        <h2>Fuentes</h2>
        <p><b>Texto castellano:</b> Sagrada Biblia, traducción de la Facultad de Teología de la Universidad de Navarra (Biblia de Navarra), según el texto publicado por EWTN. Solo para uso personal.</p>
        <p><b>Latín:</b> Nova Vulgata (Neovulgata), con la misma numeración que el texto castellano.</p>
        <p><b>Santos Padres:</b> Catena Aurea de Santo Tomás de Aquino (Evangelios), traducción castellana publicada en mercaba.org.</p>
      </section>
    </main>
  )
}
