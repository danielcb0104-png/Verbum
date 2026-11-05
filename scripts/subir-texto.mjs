// Sube los datos privados (carpeta ./privado: texto Nácar-Colunga y comentarios) al bucket privado "biblia" de Supabase.
// Uso:  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run subir-texto
import { createClient } from '@supabase/supabase-js'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error('Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }
const sb = createClient(url, key)
const root = process.argv[2] || 'privado'
const files = []
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : f.endsWith('.json') && files.push(p) } }
walk(root)
let ok = 0
for (const f of files) {
  const dest = relative(root, f).split('\\').join('/')
  const { error } = await sb.storage.from('biblia').upload(dest, readFileSync(f), { contentType: 'application/json', upsert: true })
  if (error) { console.error(dest, error.message); continue }
  ok++; process.stdout.write(`\r${ok}/${files.length} subidos`)
}
console.log(`\nListo: ${ok} archivos en el bucket privado "biblia".`)
