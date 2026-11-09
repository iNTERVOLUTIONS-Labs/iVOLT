# iVOLT — Flujo de trabajo y propiedad de archivos

## 1. Roles

| Rol | Hace | No hace |
|---|---|---|
| Integrador | arquitectura, contratos, revisión de hitos, integración de propuestas, `PROJECT_STATE.md` | reimplementar lo encargado |
| Implementador | tareas delimitadas con archivos asignados | tocar archivos compartidos, subcontratar la tarea |
| Revisor puntual | revisar un contrato o una familia con lista de comprobación | reescribir |

Máximo dos implementadores simultáneos, solo si sus archivos y dependencias son independientes, y cada uno en su propio worktree.

## 2. Propiedad de archivos

| Propietario único (integrador) | Los implementadores proponen, no editan |
|---|---|
| `package.json` raíz y de `packages/ivolt`, `package-lock.json` | dependencias y scripts |
| `packages/ivolt/tokens/tokens.json` y generadores | nuevos tokens |
| `docs/API_CONTRACT.md`, `docs/DECISIONS.md`, `PROJECT_STATE.md` | cambios de contrato con motivo |
| Entradas `core.css`, `ivolt.css`, `index.js`, `iife.js`, `exports` | registro de un módulo nuevo |

Cada encargo trae una lista explícita de archivos permitidos; todo lo demás va en el bloque «Propuestas» de la entrega.

## 3. Plantilla de encargo

```
Objetivo: <una frase medible>
Archivos permitidos: <rutas>
Contratos: <secciones concretas de API_CONTRACT / DESIGN_SYSTEM / QUALITY>
Entregable: <archivos completos, sin TODO ni "resto igual">
Pruebas: <comandos exactos que deben pasar>
Condición de parada: <alcance máximo; qué entregar si no termina>
Reporta: archivos tocados, pruebas ejecutadas con salida resumida, propuestas para archivos compartidos, dudas.
```

Una tarea parcial deja su estado en la entrega; se retoma con un encargo nuevo que cite ese estado.

## 4. Ciclo de integración

1. El integrador prepara el encargo y, mientras se ejecuta, hace trabajo independiente (docs, fixtures, pruebas de contrato) sin duplicar la implementación.
2. Al recibir la entrega: ejecutar las pruebas citadas, revisar contra el contrato, aplicar propuestas a archivos compartidos.
3. Tras dos intentos fallidos en el mismo error: parar, diagnosticar con evidencia (logs acotados, bisección), decidir; no repetir a ciegas.
4. Cerrar hito: suite del gate, `PROJECT_STATE.md` (estado, archivos, verificaciones, fallos abiertos, siguiente acción, decisiones), commit.

Dos ejecuciones de Playwright en el mismo árbol a la vez comparten `test-results/` y se borran los artefactos mutuamente (fallos fantasma con `ENOENT … .playwright-artifacts`): cada ejecución concurrente usa `--output=/tmp/<nombre>` y `--trace=off`, o las pasadas se serializan. Registrado en v0.8. El servidor de fixtures (puerto 4180) se reutiliza si ya está levantado: con dos worktrees a la vez, uno puede probar el código del otro.

## 5. Alcance

- Lecturas agrupadas, ediciones localizadas, sin volcar `node_modules`, logs enormes ni archivos completos en los informes.
- La biblia no se carga en cada tarea.
- Sin imágenes generadas por servicios de pago, sin publicar paquetes, desplegar, comprar dominios ni activar servicios de pago sin autorización del propietario.

## 6. Reanudación de una fase

Al recibir `IMPLEMENT_PHASE_N`: leer `PROJECT_STATE.md` y la sección N de `ROADMAP.md`; ejecutar `npm ci && npm test` (desde fase 1) para confirmar la línea base; no reinvestigar ni reescribir la biblia. Si un requisito nuevo contradice un ADR, exponer el cambio, añadir ADR y aplicar solo lo necesario. Ejecutar íntegramente la fase pedida con sus verificaciones y detenerse.
