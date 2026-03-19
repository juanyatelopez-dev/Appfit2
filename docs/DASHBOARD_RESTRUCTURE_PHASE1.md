# Dashboard Restructure Phase 1

## Scope

Reestructurar el dashboard principal (`/today`) usando la UI actual como base y tomando como referencia una composicion de cards mas jerarquica e interactiva.

Restriccion: no replicar tema visual (color, fondo, estilo de marca). Solo estructura, orden de contenido y patrones de interaccion.

## CTO Task Analysis

- Tipo de tarea: refactorizacion + optimizacion de UX estructural.
- Impacto tecnico:
  - Arquitectura: medio-alto (composicion frontend).
  - Codigo: alto en `src/pages/Dashboard.tsx` y modulos relacionados.
  - Infraestructura: bajo.
- Agentes usados:
  - `C:\Users\STEVAN\Documents\GitHub\agents\cto_agent.md`
  - `C:\Users\STEVAN\Documents\GitHub\agents\architecture_agent.md`
  - `C:\Users\STEVAN\Documents\GitHub\agents\frontend_agent.md`
  - `C:\Users\STEVAN\Documents\GitHub\agents\qa_agent.md`

## Target Composition (Phase 1)

Definir 5 zonas de layout:

1. Hero operativo
- Card principal con estado del dia, score y CTA primario.
- Cards satelite de resumen semanal y consistencia.

2. Accion inmediata
- Banda corta con proxima accion recomendada.
- 1 accion primaria y maximo 2 secundarias.

3. Operacion diaria
- Grid compacto para agua, calorias, sueno, pasos, peso, nutricion, biofeedback.
- Priorizado para registro rapido.

4. Insights y contexto
- Tendencias, calendario y resumenes de progreso.
- Menos densidad operativa, mas lectura.

5. Extension progresiva
- Modulos secundarios bajo patron "ver mas".
- Colapsado por defecto para reducir carga cognitiva.

## Frontend Implementation Blueprint

### 1. Contracts and Registry

Crear:
- `dashboardTypes.ts`
- `dashboardRegistry.ts`
- `dashboardViewModel.ts`

Objetivo:
- Tipado fuerte para cards, estado, placement y acciones.
- Un solo registro para orden mobile/desktop.
- UI desacoplada de calculos de negocio.

### 2. Reusable Dashboard Primitives

Crear:
- `DashboardCardShell`
- `DashboardSectionTitle`
- `DashboardLoadingState`
- `DashboardEmptyState`
- `DashboardCardStack`

Objetivo:
- Unificar estructura de cards.
- Reducir duplicacion y drift visual.
- Estabilizar estados de carga/vacio.

### 3. Page Orchestration Refactor

`Dashboard.tsx` queda como orquestador:
- Consume snapshot + preferencias.
- Pasa `viewModel` a componentes presentacionales.
- Evita calculos complejos inline en JSX.

### 4. Responsive Ordering Rules

- Mobile: orden narrativo top-down por prioridad.
- Desktop: dos columnas balanceadas sin romper narrativa.
- Fuente unica de verdad: `dashboardRegistry`.

### 5. Interactivity Baseline

- Transiciones cortas orientadas a estado (no decorativas).
- Feedback de accion inmediata en botones/toggles.
- Skeletons consistentes para evitar layout shift.

## QA Acceptance (Phase 1)

- Unit tests:
  - ordenamiento/layout (`balanceDashboardColumns`, stack logic),
  - progreso diario y seleccion de CTA,
  - normalizacion de preferencias.
- Integration tests:
  - render estructural del dashboard con mocks,
  - toggles de widgets/modulos y persistencia,
  - estados loading/empty/partial.
- E2E:
  - jerarquia visual por breakpoint,
  - navegacion por teclado,
  - regresion de layout en mobile/tablet/desktop.
- Accesibilidad:
  - labels,
  - focus visible,
  - no depender solo de color para estado.

## Risks

- Acoplamiento excesivo si la logica se mantiene en la pagina.
- Regresion responsive si orden mobile/desktop queda duplicado.
- Divergencia de preferencias (remote profile vs local fallback).
- Riesgo de secretos: no hardcodear keys, no filtrar `.env`, no loggear payloads sensibles.

## Security Rule

Nunca incluir credenciales reales en codigo, docs ni ejemplos. Usar placeholders.

## Completion Criteria

Fase 1 se considera completa cuando:
- la estructura de cards y orden responsive quedan estabilizados,
- se mantiene paridad funcional,
- y QA valida que no hay regresiones visuales/interactivas criticas.
