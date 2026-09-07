// Ejecuta un fichero .sql contra el proyecto de Supabase.
//
// Por qué existe: la clave `anon` que usa la web es pública y solo puede leer y
// escribir filas; no crea tablas. Hasta ahora cada tabla se ha creado pegando
// SQL a mano en el editor web, lo que significa que nadie puede automatizar un
// cambio de esquema ni repetirlo. Con esto basta un token en el entorno y el
// SQL del repo pasa a ser algo que se aplica con un comando.
//
//   npm run db:despedida
//   node scripts/supabase-sql.mjs supabase/otra-cosa.sql
//
// Necesita SUPABASE_ACCESS_TOKEN, que es un token personal de
// https://supabase.com/dashboard/account/tokens (empieza por `sbp_`). Se puede
// dejar en `.env`, que está en .gitignore. NO sirve la clave anon.
import fs from 'node:fs'
import path from 'node:path'

const PROYECTO = 'xuizujrljtkmffhrpqel'
const API = `https://api.supabase.com/v1/projects/${PROYECTO}/database/query`

/** Lee .env sin dependencias: dos líneas y evitamos meter dotenv por esto. */
function cargarEnv() {
  const f = path.resolve(process.cwd(), '.env')
  if (!fs.existsSync(f)) return
  for (const linea of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(linea)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

function salir(mensaje, codigo = 1) {
  console.error(mensaje)
  process.exit(codigo)
}

cargarEnv()

const fichero = process.argv[2] ?? 'supabase/despedida.sql'
if (!fs.existsSync(fichero)) salir(`No encuentro el fichero: ${fichero}`)

const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) {
  salir(
    'Falta SUPABASE_ACCESS_TOKEN.\n\n' +
    '  1. Crea un token en https://supabase.com/dashboard/account/tokens\n' +
    '  2. Añádelo a .env (está en .gitignore):\n' +
    '       SUPABASE_ACCESS_TOKEN=sbp_...\n' +
    '  3. Vuelve a lanzar este comando.\n\n' +
    'La clave anon del proyecto NO vale: es pública y no puede crear tablas.',
  )
}

const query = fs.readFileSync(fichero, 'utf8')
console.log(`Aplicando ${fichero} sobre el proyecto ${PROYECTO}…`)

const res = await fetch(API, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }),
})

const cuerpo = await res.text()
if (!res.ok) {
  salir(
    res.status === 401 || res.status === 403
      ? `El token no vale para este proyecto (${res.status}). Revisa que sea un token personal y que la cuenta tenga acceso a ${PROYECTO}.`
      : `Supabase ha respondido ${res.status}:\n${cuerpo}`,
  )
}

console.log('Listo.')
if (cuerpo && cuerpo !== '[]') console.log(cuerpo)
