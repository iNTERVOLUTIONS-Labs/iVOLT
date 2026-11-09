# iVOLT — Despliegue de la web (ivolt.intervolutions.com)

La web es estática: `apps/docs/dist` completo tras `npm run build:docs` (o `npm run verify`). El despliegue lo ejecuta el propietario; este repositorio no despliega nada.

## 0. Build en el servidor (la carpeta `apps/docs/dist` no está en el repositorio)

`dist/` está en `.gitignore`: un checkout no trae la web. El paso de build del despliegue, verificado en un clon limpio (solo Node, sin navegadores):

```sh
npm ci                # Node >= 22, npm >= 10; instala sharp y lightningcss precompilados
npm run build:docs    # construye el paquete si falta y después la web (Astro + Pagefind)
```

Salida: `apps/docs/dist` (~43 MB con fotografías, capturas y descargas). Si no hay navegadores de Playwright en el servidor, `build-shots.mjs` avisa y conserva las capturas versionadas en `apps/docs/public/shots`; el build termina igual.

Desde 1.1 el build escribe además, sin navegador:

- **Tarjetas para compartir** (`scripts/build-og.mjs`): `og.png`, `og/es.png` y una tarjeta JPEG por página en `og/…`, más `favicon.ico`, `apple-touch-icon.png`, iconos de instalación y `manifest.webmanifest`. Se dibujan con `@resvg/resvg-js` (binario precompilado que instala `npm ci`) y Outfit en TTF (`apps/docs/og-fonts`); **si no puede dibujarlas, el build falla**: en 1.0 el script avisaba y salía con 0, y todas las páginas publicaban un `og:image` que daba 404.
- **Versiones AVIF/WebP de las capturas** (`scripts/build-images.mjs`, con el `sharp` que ya instala Astro).
- **Gemelos Markdown, `llms.txt` y `llms-full.txt`** (`scripts/build-llms.mjs`, tras Astro): `/components/button.md` junto a `/components/button`, etc.
- **Hojas de la galería de temas**: `/themes/<tema>.css`.

La cifra de estrellas de GitHub del botón de la portada se pide **en el build** (3 s de límite; sin red, el botón sale sin número; `IVOLT_NO_NETWORK=1` lo omite). El visitante nunca pide nada a otro dominio.

**Con Orbit** ([iNTERVOLUTIONS-Labs/orbit](https://github.com/iNTERVOLUTIONS-Labs/orbit)) no hay que configurar nada: el repositorio trae `orbit.json` en la raíz y Orbit lo lee en lugar de adivinar. Sin él, la detección automática del monorepo lanzaba `npm run build` desde la raíz, que solo construye el paquete, y nginx apuntaba a una carpeta vacía.

```json
{ "type": "static", "build": "npm ci --include=dev && npm run build:docs", "outdir": "apps/docs/dist", "spa": false }
```

Lo que Orbit ya hace por su cuenta con ese descriptor: build desde la raíz de la release (Node 22 de su instalador, `NODE_ENV` sin definir, `CI=1`), `try_files $uri $uri/index.html $uri.html $uri/ =404` (URL limpias sin extensión), `error_page 404 /404.html`, caché inmutable de un año para `css js mjs woff2 svg png jpg webp`, HTTPS y despliegue atómico por symlink. Para una app ya creada antes del descriptor: `orbit deploy ivolt` vuelve a leer el `build`; si la app se creó con la detección antigua, recréala o corrige `A_BUILD`/`A_OUTDIR` en `/etc/orbit/apps/ivolt.conf` con los valores de arriba y ejecuta `orbit nginx-rebuild`.

## 1. URL pública

`apps/docs/astro.config.mjs` fija `site: https://ivolt.intervolutions.com` (la variable `SITE_URL` la sustituye para un host de prueba). Con ella salen absolutos: `<link rel="canonical">`, `hreflang` en/es/x-default entre páginas gemelas, `og:image`, el JSON-LD de las portadas, `sitemap-index.xml` + `sitemap-0.xml` y `robots.txt` (en `apps/docs/public/`). Si el dominio cambia, cambia ese único valor y reconstruye.

## 2. Lo que el hosting debe hacer

| Requisito | Motivo |
|---|---|
| URL limpias: `/getting-started` sirve `getting-started.html`, `/es` sirve `es.html`, sin barra final | el build usa `format: "file"` y `trailingSlash: "never"`; los enlaces internos no llevan extensión. Orbit, Netlify, Cloudflare Pages, Vercel y GitHub Pages lo hacen solos; en nginx a mano: `try_files $uri $uri.html $uri/index.html =404;` |
| `404.html` como página de error | Astro la genera en la raíz |
| `Cache-Control: public, max-age=31536000, immutable` para `/_astro/*`, `/fonts/*`, `/photos/*`, `/shots/*`, `/examples/ivolt/*`, `/badge/*` |  nombres con hash o activos que solo cambian con versión |
| `Cache-Control: no-cache` (o `max-age=0, must-revalidate`) para `*.html`, `robots.txt`, `sitemap*.xml` | para que una publicación se vea al instante |
| Tipos MIME correctos para `.woff2` (`font/woff2`), `.mjs`/`.js` (`text/javascript`), `.json`, `.md` y `llms*.txt` (`text/markdown; charset=utf-8` y `text/plain; charset=utf-8`), `.webmanifest` (`application/manifest+json`), `.avif` (`image/avif`) | Outfit, los módulos del paquete, los gemelos Markdown (nginx no trae `md` en `mime.types`: sin la línea `types { text/markdown md; }` los sirve como descarga) y el manifiesto |
| `Cache-Control` corto (p. ej. `max-age=3600`) para `/og/*`, `/themes/*.css` | sus nombres no cambian entre versiones; la portada usa `/og/index.png` desde 1.1 (`/og.png` se sigue generando para enlaces antiguos) |
| HTTPS con redirección desde HTTP y desde `www.` si se usa | canónicas absolutas en `https://ivolt.intervolutions.com` |

## 3. Cabeceras recomendadas

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`Content-Security-Policy`: la web lleva un único script en línea ejecutable (el que aplica el tema antes del primer pintado); su hash SHA-256 se muestra en `/foundations/coexistence` (`#csp-hash`) y `tests/browser/site-shell.spec.js` comprueba que sigue siendo el publicado. Los bloques JSON-LD son datos, no scripts, y no entran en la política. Política mínima que funciona con el build actual:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-<hash de /foundations/coexistence>' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://cloudflareinsights.com; frame-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self' https://codepen.io; object-src 'none'
```

(`form-action https://codepen.io` permite el botón «CodePen» de los escenarios, un formulario POST a `codepen.io/pen/define` que abre una pestaña nueva; la web no carga nada de CodePen. `style-src 'unsafe-inline'` cubre los `style=` de las fixtures y los escenarios; `frame-src 'self'` cubre los escenarios y las recetas embebidas). Verifica en el navegador tras desplegar: consola sin violaciones en `/`, `/components/button` y `/examples/studio/index.html`.

La política vive en `orbit.json` (`"csp"`, Orbit ≥ 1.5.1), así que viaja con el repositorio y la aplica cada despliegue. `static.cloudflareinsights.com` y `cloudflareinsights.com` son la analítica que Cloudflare inyecta en el HTML cuando la pide un navegador: sin ellos la política la bloquearía en silencio. Mientras `"csp_report_only": true`, el servidor envía `Content-Security-Policy-Report-Only` y las violaciones solo aparecen en la consola; se pasa a `false` cuando un recorrido de la web publicada sale limpio. Si cambia el script en línea, `site-shell.spec.js` falla hasta que el hash nuevo esté en `orbit.json`.

## 4. Comprobación tras desplegar

1. `https://ivolt.intervolutions.com/` responde 200 y `https://ivolt.intervolutions.com/getting-started` también (sin `.html`).
2. `https://ivolt.intervolutions.com/sitemap-index.xml` y `/robots.txt` accesibles.
3. Ver código fuente de `/`: `canonical`, `hreflang`, `og:image` absolutos; `application/ld+json` con `"url": "https://ivolt.intervolutions.com/"`.
4. Lighthouse en móvil sobre la URL real (`docs/LIGHTHOUSE.md` recoge las cifras del build local: 97–100).
5. Registrar el dominio en Google Search Console y enviar el sitemap.
