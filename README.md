# Sagrada Biblia (app web instalable)

Aplicación para leer en el móvil la **Sagrada Biblia (Biblia de Navarra)**. Al tocar cada versículo puedes ver:

- el **texto latino de la Neovulgata** (Nova Vulgata, edición oficial de la Iglesia), con la misma numeración,
- las **notas de Mons. Juan Straubinger** (Biblia comentada, 1948) para toda la Biblia,
- los **comentarios de los Santos Padres en castellano** (Catena Aurea de Santo Tomás, para los cuatro Evangelios).

Además puedes **marcar fragmentos** con colores, **escribir comentarios** sobre lo marcado y consultar en un **índice de todos los libros** dónde están tus marcas y comentarios. Todo se sincroniza con tu cuenta de Supabase y funciona sin conexión.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/` | Código de la app (React + Vite, PWA) |
| `public/data/` | Datos públicos: índice de libros y Vulgata (dominio público) |
| `privado/navarra/` | **Texto de la Biblia de Navarra** (73 JSON). No se sube a GitHub público: va al almacenamiento privado de Supabase |
| `privado/padres/` | **Catena Aurea en castellano** por capítulo (Evangelios). También privado |
| `supabase/schema.sql` | Tablas, seguridad (RLS) y bucket privado |
| `.github/workflows/deploy.yml` | Publicación automática en GitHub Pages |

## Puesta en marcha (una sola vez)

### 1. Supabase
1. En tu proyecto de Supabase abre **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y pulsa **Run**.
2. En **Project Settings → API** copia la **Project URL**, la clave **anon / publishable** y la **service_role / secret** (esta última no la compartas nunca).
3. Sube el texto bíblico al bucket privado desde esta carpeta:
   ```bash
   npm install
   SUPABASE_URL=https://TU-PROYECTO.supabase.co SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE npm run subir-texto
   ```
4. Abre la app, crea tu cuenta y después, en **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**. Así solo tú puedes acceder al texto.

### 2. GitHub Pages
1. Crea un repositorio (por ejemplo `biblia-nc`) y sube esta carpeta (la carpeta `privado/` está excluida por `.gitignore`).
2. En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**:
   - `VITE_SUPABASE_URL` = la Project URL
   - `VITE_SUPABASE_ANON_KEY` = la clave anon / publishable
3. **Settings → Pages → Source: GitHub Actions**.
4. Cada `git push` a `main` publica la app en `https://TU-USUARIO.github.io/biblia-nc/`.
5. En Supabase, **Authentication → URL Configuration → Site URL**: pon esa misma dirección.

### 3. Instalar en el móvil
Abre la dirección en Safari (iPhone) → Compartir → **Añadir a pantalla de inicio**; en Android (Chrome) → menú → **Instalar app**.

## Probar en el ordenador sin Supabase
```bash
npm install
mkdir -p public/nc-local && cp -r privado/* public/nc-local/
npm run dev
```
Sin las variables `VITE_SUPABASE_*` la app funciona en **modo local** (las marcas se guardan en el navegador).

## Sobre el texto
- Texto castellano: Biblia de Navarra (Facultad de Teología de la Universidad de Navarra), tomado del texto que publica EWTN. Tiene derechos de autor: es **para uso personal** y solo se descarga con sesión iniciada.
- Latín: Nova Vulgata (vatican.va), con la misma numeración que la Biblia de Navarra.
- Santos Padres: Catena Aurea de Santo Tomás de Aquino en traducción castellana (texto publicado en mercaba.org), solo Evangelios por ahora; también privada.
