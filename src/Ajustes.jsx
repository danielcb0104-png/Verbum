import React, { useContext, useState, useEffect } from 'react'
import { Ctx } from './App.jsx'
import * as S from './store.js'

function Invitaciones() {
  const { toast } = useContext(Ctx)
  const [lista, setLista] = useState(null)
  const [email, setEmail] = useState('')
  const [nombre, setNombre] = useState('')
  const cargar = () => S.listInvitaciones().then(setLista).catch(e => toast(e.message))
  useEffect(() => { cargar() }, [])
  const url = location.origin + location.pathname
  async function invitar(e) {
    e.preventDefault()
    try { await S.addInvitacion(email, nombre); setEmail(''); setNombre(''); cargar(); toast('Invitación añadida') } catch (err) { toast(err.message) }
  }
  async function compartir(i) {
    const txt = `${i.nombre ? i.nombre + ', t' : 'T'}e invito a la app de la Sagrada Biblia. Entra en ${url}, pulsa «¿Primera vez? Crear cuenta» y regístrate con este correo: ${i.email}`
    try { if (navigator.share) await navigator.share({ text: txt }); else { await navigator.clipboard.writeText(txt); toast('Mensaje copiado') } } catch { /* cancelado */ }
  }
  return (
    <section className="card">
      <h2>Invitar personas</h2>
      <p className="muted">Solo podrán crear cuenta los correos que añadas aquí. Cada persona tiene sus propias marcas y comentarios, que nadie más ve.</p>
      <form className="invform" onSubmit={invitar}>
        <input type="email" required placeholder="correo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="text" placeholder="Nombre (opcional)" value={nombre} onChange={e => setNombre(e.target.value)} />
        <button className="btn primary">Invitar</button>
      </form>
      {lista && lista.length === 0 && <p className="muted small">Aún no has invitado a nadie.</p>}
      {lista && lista.map(i => (
        <div key={i.email} className="setrow">
          <span>{i.nombre ? <b>{i.nombre}</b> : null} {i.nombre ? <br /> : null}<span className="muted small">{i.email}</span></span>
          <span className="row" style={{ marginTop: 0 }}>
            <button className="btn small" onClick={() => compartir(i)}>Enviar enlace</button>
            <button className="btn small danger" onClick={async () => { if (confirm('¿Quitar la invitación de ' + i.email + '? Dejará de tener acceso al texto.')) { await S.delInvitacion(i.email).catch(e => toast(e.message)); cargar() } }}>Quitar</button>
          </span>
        </div>
      ))}
    </section>
  )
}

export default function Ajustes() {
  const { prefs, setPrefs, session, books, marcas, toast, admin } = useContext(Ctx)
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
      {admin && !S.LOCAL && <Invitaciones />}
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
        <p><b>Notas:</b> La Sagrada Biblia comentada por Mons. Juan Straubinger (1948), dominio público (módulo SWORD de CrossWire).</p>
        <p><b>Comentario bíblico «San Jerónimo»:</b> dir. R. E. Brown, J. A. Fitzmyer y R. E. Murphy (Cristiandad, 1971-1972), a partir del escaneo de Internet Archive.</p>
        <p><b>Santos Padres:</b> Catena Aurea de Santo Tomás de Aquino (Evangelios), traducción castellana publicada en mercaba.org.</p>
      </section>
    </main>
  )
}
