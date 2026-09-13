# iVOLT — Fuentes

Fecha de consulta: 2026-09-13. Las páginas del paquete de investigación se recibieron ya resumidas; se marca «paquete» cuando el hecho procede de ese resumen y «verificado» cuando se comprobó en esta fase.

## 1. Documentación oficial usada

Las páginas del proveedor de modelos sobre esfuerzo, prompting, costes y subagentes del paquete de investigación se aplicaron en `WORKFLOW.md`; no se listan aquí porque no forman parte del producto.

| Fuente | Hecho relevante para iVOLT | Origen |
|---|---|---|
| MDN `@layer` — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@layer | Las reglas sin capa prevalecen sobre las de cualquier capa; `!important` invierte el orden | paquete |
| Bootstrap 5.3 CSS variables — https://getbootstrap.com/docs/5.3/customize/css-variables/ | Variables globales y por componente; las variables de breakpoint no sirven dentro de media queries | paquete |
| Bootstrap accessibility — https://getbootstrap.com/docs/5.3/getting-started/accessibility/ | Contraste y componentes con ARIA como responsabilidad compartida con el autor | paquete |
| UIkit JavaScript — https://getuikit.com/docs/javascript | Inicialización por atributos, API programática, observación del DOM | paquete |
| UIkit introduction — https://getuikit.com/docs/introduction | Distribución CSS + JS opcional | paquete |
| Tailwind theme — https://tailwindcss.com/docs/theme | Variables de tema alimentan utilidades | paquete |
| Tailwind detecting classes — https://tailwindcss.com/docs/detecting-classes-in-source-files | Detección textual; clases dinámicas requieren estrategia explícita | paquete |
| Bulma overview y modular Sass — https://bulma.io/documentation/start/overview/ · https://bulma.io/documentation/customize/with-modular-sass/ | Base CSS utilizable sola; importación modular | paquete |
| Foundation XY Grid y JavaScript — https://get.foundation/sites/docs/xy-grid.html · https://get.foundation/sites/docs/javascript.html | Layouts Flexbox; su JS requiere jQuery (no adoptado) | paquete |
| WCAG 2.2 quickref — https://www.w3.org/WAI/WCAG22/quickref/ | Criterios 1.4.3, 1.4.11, 2.4.7, 2.4.11, 2.5.8 usados en QUALITY | paquete |
| WAI-ARIA APG patterns — https://www.w3.org/WAI/ARIA/apg/patterns/ | Patrones dialog, tabs, disclosure, menu button, alert | paquete |
| Astro components — https://docs.astro.build/en/basics/astro-components/ | Componentes `.astro` renderizan a HTML sin JS de cliente por defecto | paquete |

## 2. Versiones observadas (`npm view`, 2026-09-13)

| Paquete | Versión | Uso previsto |
|---|---|---|
| astro | 7.3.2 | apps/docs |
| @astrojs/sitemap | 3.7.4 (instalada) | sitemap solo con `SITE_URL` definida |
| pagefind | 1.5.2 (instalada) | búsqueda local docs; índice estático servido desde el propio sitio |
| esbuild | 0.28.2 | build JS |
| lightningcss / lightningcss-cli | 1.33.0 | build CSS |
| typescript | 7.0.2 observada; 5.9.3 instalada | tipos desde JSDoc (emisión verificada con 5.9.3) |
| vitest | 5.0.0 | unitarias y contratos |
| @playwright/test | 1.63.0 | navegador |
| axe-core / @axe-core/playwright | 4.13.0 | accesibilidad automática |
| stylelint / eslint | 17.15.0 / 10.10.0 | lint |
| jsdom | 30.0.1 | unitarias DOM ligeras |

Registro npm: `ivolt`, `ivolt-css` y `@intervolutions/ivolt` devuelven 404 (no publicados). La propiedad del scope `@intervolutions` no se ha verificado.

Entorno local verificado: Node 22.23.2, npm 10.9.8, Chromium disponible (`/usr/bin/chromium-browser`) y navegadores Playwright en caché (chromium-1228).

## 3. Código y assets externos reutilizados

Ninguno en fase 0. El wordmark temporal y la lámina de diseño son originales. Cualquier incorporación futura (fuente OFL, iconos) se registra aquí con licencia y atribución.
