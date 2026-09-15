# iVOLT — Workflow, agentes y control de coste

## 1. Roles

| Rol | Modelo | Hace | No hace |
|---|---|---|---|
| Líder / integrador | Fable 5.1 (esfuerzo high por defecto) | arquitectura, contratos, revisión de hitos, integración de propuestas, `PROJECT_STATE.md` | reimplementar lo delegado |
| Implementador | Opus 5 (`model: "opus"` en la herramienta Agent) | tareas delimitadas con archivos asignados | tocar archivos compartidos, lanzar otros agentes |
| Revisor puntual | Opus 5 | revisar un contrato o una familia con lista de comprobación | reescribir |

Nunca agentes Fable subordinados ni delegación recursiva. Máximo dos implementadores simultáneos, solo si sus archivos y dependencias son independientes. Fase 0 verificó que la herramienta Agent admite `model: "opus"` y que el agente lanzado se identificó como Opus 5; cada encargo pide esa identificación y el líder la contrasta con el entorno. Si el entorno no permitiera Opus 5, el líder no simula la delegación: escribe el encargo en `docs/handoffs/` para ejecutarlo aparte.

## 2. Propiedad de archivos

| Propietario único (integrador) | Los agentes proponen, no editan |
|---|---|
| `package.json` raíz y de `packages/ivolt`, `package-lock.json` | dependencias y scripts |
| `packages/ivolt/tokens/tokens.json` y generadores | nuevos tokens |
| `docs/API_CONTRACT.md`, `docs/DECISIONS.md`, guía raíz de agentes, `PROJECT_STATE.md` | cambios de contrato con motivo |
| Entradas `core.css`, `ivolt.css`, `index.js`, `iife.js`, `exports` | registro de un módulo nuevo |

Un agente recibe una lista explícita de archivos permitidos; todo lo demás va en el bloque «Propuestas» de su entrega.

## 3. Plantilla de encargo

```
Objetivo: <una frase medible>
Archivos permitidos: <rutas>
Contratos: <secciones concretas de API_CONTRACT / DESIGN_SYSTEM / QUALITY>
Entregable: <archivos completos, sin TODO ni "resto igual">
Pruebas: <comandos exactos que deben pasar>
Condición de parada: <turnos máximos; qué entregar si no termina>
Reporta: modelo efectivo, archivos tocados, pruebas ejecutadas con salida resumida, propuestas para archivos compartidos, dudas.
```

Límites iniciales: revisión ≤ 8 turnos, implementación ≤ 20 turnos. Una tarea parcial deja su estado en la entrega; se reanuda con `SendMessage` al mismo agente si sigue vivo, o con un encargo nuevo que cite ese estado. No se envía el historial completo a ningún agente.

## 4. Ciclo de integración

1. El líder prepara el encargo y, mientras el agente trabaja, hace trabajo independiente (docs, fixtures, pruebas de contrato) sin duplicar la implementación.
2. Al recibir la entrega: ejecutar las pruebas citadas, revisar contra el contrato, aplicar propuestas a archivos compartidos.
3. Tras dos intentos fallidos en el mismo error: parar, diagnosticar con evidencia (logs acotados, bisección), decidir; no repetir a ciegas. Escalar esfuerzo solo para ese bloqueo.
4. Cerrar hito: suite del gate, `PROJECT_STATE.md` (estado, archivos, verificaciones, fallos abiertos, siguiente acción, decisiones), commit.

Dos agentes que ejecutan Playwright en el mismo árbol a la vez comparten `test-results/` y se borran los artefactos mutuamente (fallos fantasma con `ENOENT … .playwright-artifacts`): cada encargo con pruebas de navegador concurrentes usa `--output=/tmp/<nombre-del-agente>` y `--trace=off`, o las pasadas se serializan. Registrado en v0.8 tras dos revisores simultáneos.

## 5. Control de coste

- Los topes económicos viven en el proveedor o en la herramienta (`/usage` en la herramienta de agentes). Este documento limita alcance y acciones, no facturación.
- Gasto/tokens por fase: «no disponible» salvo que el entorno lo exponga; hitos y turnos son los límites operativos.
- Lecturas agrupadas, ediciones localizadas, sin volcar `node_modules`, logs enormes ni archivos completos al chat.
- Guía raíz de agentes < 120 líneas; la biblia no se carga en cada tarea.
- Sin imágenes generadas por modelos de pago, sin publicar paquetes, desplegar, comprar dominios ni activar servicios de pago.

## 6. Reanudación de una fase

Al recibir `IMPLEMENT_PHASE_N`: leer la guía raíz de agentes, `PROJECT_STATE.md` y la sección N de `ROADMAP.md`; ejecutar `npm ci && npm test` (desde fase 1) para confirmar la línea base; no reinvestigar ni reescribir la biblia. Si un requisito nuevo contradice un ADR, exponer el cambio, añadir ADR y aplicar solo lo necesario. Ejecutar íntegramente la fase pedida con sus verificaciones y detenerse.

## 7. Nota sobre la verificación del modelo (fase 1)

La herramienta de agentes selecciona el nivel Opus con `model: "opus"`, que el entorno documenta como Opus 5. La autoidentificación de los agentes no es fiable: en fase 1 uno respondió «Opus 5» y otro «Opus 4.5» con la misma configuración. Se registra la configuración usada, no la autodeclaración.
