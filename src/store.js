import { createClient } from '@supabase/supabase-js'
import { get as idbGet, set as idbSet } from 'idb-keyval'

const URL_SB = import.meta.env.VITE_SUPABASE_URL
const KEY_SB = import.meta.env.VITE_SUPABASE_ANON_KEY
export const LOCAL = !URL_SB || !KEY_SB
export const supabase = LOCAL ? null : createClient(URL_SB, KEY_SB)
const BASE = import.meta.env.BASE_URL

// ---------------- utilidades ----------------
async function getJSON(path) {
  const r = await fetch(BASE + path)
  if (!r.ok) throw new Error('No se pudo cargar ' + path)
  return r.json()
}
const mem = new Map()
async function cached(key, loader) {
  if (mem.has(key)) return mem.get(key)
  const p = loader().catch(e => { mem.delete(key); throw e })
  mem.set(key, p)
  return p
}

// ---------------- datos públicos ----------------
export const loadBooks = () => cached('books', () => getJSON('data/books.json'))
export const loadAutores = () => cached('autores', () => getJSON('data/autores.json'))
export const loadVulgata = id => cached('vul:' + id, () => getJSON(`data/vulgata/${id}.json`))
// ---------------- datos privados (bucket "biblia" de Supabase) ----------------
async function loadPrivate(path) {
  const k = 'priv:' + path
  let d = null
  try { d = await idbGet(k) } catch { /* sin IndexedDB */ }
  if (d) return d
  if (LOCAL) {
    d = await getJSON('nc-local/' + path)
  } else {
    const { data, error } = await supabase.storage.from('biblia').download(path)
    if (error) throw new Error('No se pudo descargar (' + error.message + ')')
    d = JSON.parse(await data.text())
  }
  try { await idbSet(k, d) } catch { /* ignore */ }
  return d
}
export const loadNC = id => cached('nc:' + id, () => loadPrivate(`navarra/${id}.json`))
export const loadBcIndex = () => cached('bcidx', () => loadPrivate('bc/index.json'))
export const loadBc = (id, c) => cached(`bc:${id}:${c}`, async () => {
  const idx = await loadBcIndex()
  if (!idx[id] || !idx[id].includes(c)) return []
  return loadPrivate(`bc/${id}/${c}.json`)
})
export const loadPapasIndex = () => cached('ppidx', () => loadPrivate('papas/index.json'))
export const loadPapas = id => cached('pp:' + id, async () => {
  const idx = await loadPapasIndex()
  if (!idx.includes(id)) return []
  return loadPrivate(`papas/${id}.json`)
})
export const loadStraubIndex = () => cached('sidx', () => loadPrivate('straub/index.json'))
export const loadStraub = (id, c) => cached(`straub:${id}:${c}`, async () => {
  const idx = await loadStraubIndex()
  if (!idx[id] || !idx[id].includes(c)) return []
  return loadPrivate(`straub/${id}/${c}.json`)
})
export const loadPadresIndex = () => cached('pidx', () => loadPrivate('padres/index.json'))
export const loadPadres = (id, c) => cached(`pad:${id}:${c}`, async () => {
  const idx = await loadPadresIndex()
  if (!idx[id] || !idx[id][c]) return []
  return loadPrivate(`padres/${id}/${c}.json`)
})

// ---------------- autenticación ----------------
export async function getSession() {
  if (LOCAL) return { user: { id: 'local', email: 'modo local' } }
  const { data } = await supabase.auth.getSession()
  return data.session
}
export function onAuth(cb) {
  if (LOCAL) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_e, s) => cb(s))
  return () => data.subscription.unsubscribe()
}
export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}
export async function signUp(email, password) {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
}
// ---------------- acceso e invitaciones ----------------
export async function miAcceso() {
  if (LOCAL) return { miembro: true, admin: true }
  const [m, a] = await Promise.all([supabase.rpc('es_miembro'), supabase.rpc('es_admin')])
  if (m.error) throw m.error
  return { miembro: !!m.data, admin: !!a.data }
}
export async function listInvitaciones() {
  if (LOCAL) return []
  const { data, error } = await supabase.from('invitaciones').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data
}
export async function addInvitacion(email, nombre) {
  const { error } = await supabase.from('invitaciones').insert({ email: email.trim().toLowerCase(), nombre: nombre?.trim() || null })
  if (error) throw new Error(error.code === '23505' ? 'Ese correo ya está invitado' : error.message)
}
export async function delInvitacion(email) {
  const { error } = await supabase.from('invitaciones').delete().eq('email', email)
  if (error) throw error
}
export async function signOut() { if (!LOCAL) await supabase.auth.signOut() }

// ---------------- marcas y comentarios ----------------
const LS_MARCAS = 'biblia.marcas'
const lsGet = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def } catch { return def } }
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

export async function listMarcas() {
  if (LOCAL) return lsGet(LS_MARCAS, [])
  const { data, error } = await supabase.from('marcas').select('*').order('created_at')
  if (error) throw error
  try { await idbSet('marcas-cache', data) } catch { /* ignore */ }
  return data
}
export async function listMarcasOffline() {
  try { return (await idbGet('marcas-cache')) || [] } catch { return [] }
}
export async function addMarca(m) {
  if (LOCAL) {
    const all = lsGet(LS_MARCAS, [])
    const row = { ...m, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    all.push(row); lsSet(LS_MARCAS, all); return row
  }
  const { data, error } = await supabase.from('marcas').insert(m).select().single()
  if (error) throw error
  return data
}
export async function updateMarca(id, patch) {
  if (LOCAL) {
    const all = lsGet(LS_MARCAS, []).map(x => x.id === id ? { ...x, ...patch, updated_at: new Date().toISOString() } : x)
    lsSet(LS_MARCAS, all); return all.find(x => x.id === id)
  }
  const { data, error } = await supabase.from('marcas').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) throw error
  return data
}
export async function deleteMarca(id) {
  if (LOCAL) { lsSet(LS_MARCAS, lsGet(LS_MARCAS, []).filter(x => x.id !== id)); return }
  const { error } = await supabase.from('marcas').delete().eq('id', id)
  if (error) throw error
}

// ---------------- correcciones personales del texto ----------------
const LS_CORR = 'biblia.correcciones'
export async function listCorrecciones() {
  if (LOCAL) return lsGet(LS_CORR, [])
  const { data, error } = await supabase.from('correcciones').select('libro,cap,vers,texto')
  if (error) throw error
  return data
}
export async function saveCorreccion(libro, cap, vers, texto) {
  if (LOCAL) {
    const all = lsGet(LS_CORR, []).filter(x => !(x.libro === libro && x.cap === cap && x.vers === vers))
    if (texto) all.push({ libro, cap, vers, texto })
    lsSet(LS_CORR, all); return
  }
  if (!texto) {
    const { error } = await supabase.from('correcciones').delete().match({ libro, cap, vers })
    if (error) throw error
    return
  }
  const { error } = await supabase.from('correcciones').upsert({ libro, cap, vers, texto }, { onConflict: 'user_id,libro,cap,vers' })
  if (error) throw error
}

// ---------------- preferencias ----------------
const LS_PREF = 'biblia.prefs'
export const loadPrefs = () => ({ font: 19, tema: 'claro', latin: false, medievales: true, notasNC: false, ...lsGet(LS_PREF, {}) })
export const savePrefs = p => lsSet(LS_PREF, p)
export const lastPos = { get: () => lsGet('biblia.pos', null), set: p => lsSet('biblia.pos', p) }
