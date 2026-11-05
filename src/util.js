export const COLORES = [
  { id: 'amarillo', nombre: 'Amarillo' },
  { id: 'verde', nombre: 'Verde' },
  { id: 'azul', nombre: 'Azul' },
  { id: 'rosa', nombre: 'Rosa' },
  { id: 'naranja', nombre: 'Naranja' },
  { id: 'subrayado', nombre: 'Solo subrayado' }
]

export const POESIA = new Set(['sal', 'job', 'pro', 'ecl', 'can', 'sab', 'eclo', 'lam', 'isa', 'jer', 'ose', 'joe', 'amo', 'abd', 'miq', 'nah', 'hab', 'sof', 'age', 'zac', 'mal', 'eze', 'dan', 'bar'])

// Referencia al estilo español: "Jn 1,3-5" / "Gén 1,31–2,3"
export function refMarca(book, m) {
  const ab = book ? book.abbr : m.libro
  if (m.v_ini === m.v_fin) return `${ab} ${m.cap},${m.v_ini}`
  if (m.cap_fin && m.cap_fin !== m.cap) return `${ab} ${m.cap},${m.v_ini}–${m.cap_fin},${m.v_fin}`
  return `${ab} ${m.cap},${m.v_ini}-${m.v_fin}`
}

export const go = h => { window.location.hash = h }

export function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const p = h.split('/').filter(Boolean)
  if (p[0] === 'l') return { view: 'leer', libro: p[1], cap: +p[2] || 1, vers: p[3] ? +p[3] : null }
  if (p[0] === 'marcas') return { view: 'marcas', libro: p[1] || null }
  if (p[0] === 'ajustes') return { view: 'ajustes' }
  if (p[0] === 'buscar') return { view: 'buscar', q: decodeURIComponent(p[1] || '') }
  if (p[0] === 'libro') return { view: 'indice', libro: p[1] }
  return { view: 'indice', libro: null }
}

// Texto efectivo de un versículo (con corrección del usuario si existe)
export const keyV = (l, c, v) => `${l}|${c}|${v}`

export function normaliza(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

// Calcula el desplazamiento (en caracteres del texto del versículo) de un punto del DOM
export function offsetEn(vt, node, off) {
  let n = 0
  let found = null
  const walk = el => {
    for (const ch of el.childNodes) {
      if (found !== null) return
      if (ch === node && ch.nodeType === 3) { found = n + off; return }
      if (ch.nodeType === 3) {
        if (ch.parentElement?.closest('[data-skip]')) continue
        n += ch.length
      } else if (ch.nodeType === 1) {
        if (ch === node) {
          // punto dentro de un elemento: contar hijos previos
          let k = 0
          for (let i = 0; i < off && i < ch.childNodes.length; i++) k += lenNode(ch.childNodes[i])
          found = n + k; return
        }
        if (ch.dataset && ch.dataset.len) { n += +ch.dataset.len; continue }
        if (ch.dataset && ch.dataset.skip !== undefined) continue
        walk(ch)
      }
    }
  }
  if (node === vt) {
    let k = 0
    for (let i = 0; i < off && i < vt.childNodes.length; i++) k += lenNode(vt.childNodes[i])
    return k
  }
  walk(vt)
  return found
}
function lenNode(ch) {
  if (ch.nodeType === 3) return ch.parentElement?.closest('[data-skip]') ? 0 : ch.length
  if (ch.nodeType !== 1) return 0
  if (ch.dataset.len) return +ch.dataset.len
  if (ch.dataset.skip !== undefined) return 0
  let k = 0
  for (const c of ch.childNodes) k += lenNode(c)
  return k
}
