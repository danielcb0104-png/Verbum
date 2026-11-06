import React, { useEffect, useMemo, useState, useCallback } from 'react'
import * as S from './store.js'
import { parseHash, go, keyV } from './util.js'
import Login from './Login.jsx'
import Indice from './Indice.jsx'
import Reader from './Reader.jsx'
import Marcas from './Marcas.jsx'
import Ajustes from './Ajustes.jsx'
import Buscar from './Buscar.jsx'

export const Ctx = React.createContext(null)

export default function App() {
  const [session, setSession] = useState(undefined)
  const [route, setRoute] = useState(parseHash())
  const [books, setBooks] = useState(null)
  const [marcas, setMarcas] = useState([])
  const [corr, setCorr] = useState({})
  const [prefs, setPrefsState] = useState(S.loadPrefs())
  const [toast, setToast] = useState(null)
  const [acceso, setAcceso] = useState(null)

  useEffect(() => {
    S.getSession().then(setSession)
    return S.onAuth(setSession)
  }, [])
  useEffect(() => {
    const f = () => setRoute(parseHash())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  useEffect(() => { S.loadBooks().then(setBooks).catch(e => setToast(e.message)) }, [])
  useEffect(() => {
    if (!session) { setAcceso(null); return }
    S.miAcceso().then(setAcceso).catch(() => setAcceso({ miembro: true, admin: false }))
  }, [session])
  useEffect(() => {
    if (!session) return
    S.listMarcas().then(setMarcas).catch(async e => {
      setMarcas(await S.listMarcasOffline())
      setToast('Sin conexión: mostrando marcas guardadas en el dispositivo')
    })
    S.listCorrecciones().then(rows => {
      const m = {}; rows.forEach(r => { m[keyV(r.libro, r.cap, r.vers)] = r.texto }); setCorr(m)
    }).catch(() => {})
  }, [session])
  useEffect(() => {
    document.documentElement.dataset.tema = prefs.tema
    document.documentElement.style.setProperty('--fs', prefs.font + 'px')
  }, [prefs])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) } }, [toast])

  const setPrefs = useCallback(p => { setPrefsState(p); S.savePrefs(p) }, [])
  const bookById = useMemo(() => Object.fromEntries((books || []).map(b => [b.id, b])), [books])

  const api = useMemo(() => ({
    async add(m) { const r = await S.addMarca(m); setMarcas(x => [...x, r]); return r },
    async update(id, p) { const r = await S.updateMarca(id, p); setMarcas(x => x.map(y => y.id === id ? r : y)); return r },
    async remove(id) { await S.deleteMarca(id); setMarcas(x => x.filter(y => y.id !== id)) },
    async corregir(l, c, v, t) {
      await S.saveCorreccion(l, c, v, t)
      setCorr(x => { const n = { ...x }; if (t) n[keyV(l, c, v)] = t; else delete n[keyV(l, c, v)]; return n })
    }
  }), [])

  if (session === undefined) return <div className="splash">Cargando…</div>
  if (!session) return <Login />
  if (!acceso) return <div className="splash">Cargando…</div>
  if (!acceso.miembro) return (
    <div className="login"><div className="login-card">
      <div className="login-cross" aria-hidden="true">✠</div>
      <h1>Sin acceso</h1>
      <p className="sub">Tu cuenta ({session.user?.email}) todavía no tiene invitación. Pide a quien te recomendó la app que te invite con este correo.</p>
      <button className="btn" onClick={() => S.signOut()}>Cerrar sesión</button>
    </div></div>
  )

  const ctx = { books, bookById, marcas, corr, prefs, setPrefs, api, toast: setToast, session, admin: acceso.admin }
  let view
  if (!books) view = <div className="splash">Cargando…</div>
  else if (route.view === 'leer') view = <Reader key={route.libro + route.cap} route={route} />
  else if (route.view === 'marcas') view = <Marcas libro={route.libro} />
  else if (route.view === 'ajustes') view = <Ajustes />
  else if (route.view === 'buscar') view = <Buscar q0={route.q} />
  else view = <Indice abierto={route.libro} />

  return (
    <Ctx.Provider value={ctx}>
      <div className="app">
        {view}
        {route.view !== 'leer' && <NavBar view={route.view} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </Ctx.Provider>
  )
}

function NavBar({ view }) {
  const items = [
    ['indice', 'Índice', '#/', IconBook],
    ['marcas', 'Mis marcas', '#/marcas', IconMark],
    ['buscar', 'Buscar', '#/buscar', IconSearch],
    ['ajustes', 'Ajustes', '#/ajustes', IconGear]
  ]
  return (
    <nav className="navbar">
      {items.map(([v, label, href, Icon]) => (
        <a key={v} href={href} className={view === v ? 'on' : ''}><Icon /><span>{label}</span></a>
      ))}
    </nav>
  )
}
const svg = d => () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
export const IconBook = svg(<><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /><path d="M9 7h6" /></>)
export const IconRead = svg(<><path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2z" /><path d="M22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z" /></>)
export const IconMark = svg(<><path d="M6 3h12v18l-6-4-6 4z" /></>)
export const IconSearch = svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>)
export const IconGear = svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>)
export const IconBack = svg(<path d="m15 18-6-6 6-6" />)
export const IconNext = svg(<path d="m9 18 6-6-6-6" />)
export const IconClose = svg(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>)
export const IconNote = svg(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>)
export const IconCopy = svg(<><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>)
export const IconCross = svg(<><path d="M12 3v18" /><path d="M7 8h10" /></>)
export { go }
