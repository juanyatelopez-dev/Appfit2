# Plan de Integracion Tremor (AppFit)

## 1) Instalacion

El proyecto quedo preparado para usar Tremor con estos cambios:

- `package.json` dependencies:
  - `@tremor/react`
  - `@headlessui/react`
  - `@remixicon/react`
  - `@tailwindcss/forms` (dev)
- `tailwind.config.ts`:
  - added Tremor content paths
  - added Tremor theme tokens (`tremor` and `dark-tremor`)
  - added Tremor utility tokens (radius, shadows, typography)
  - enabled `@tailwindcss/forms` plugin

Ejecuta localmente (con Node 20+):

```bash
npm install
```

## 2) Dashboards recomendados para AppFit

1. Command Center Diario
- Objetivo: una pantalla de "que hago ahora".
- Bloques: to-do diario, accesos rapidos, anillo agua/sueno, racha, ultima comida.

2. Recuperacion y Readiness
- Objetivo: medir disponibilidad diaria para entrenar.
- Bloques: recovery score, tendencia de sueno, tendencia de estres, adherencia de hidratacion, heatmap semanal.

3. Composicion Corporal y Tendencia de Peso
- Objetivo: seguimiento fisico para metas de recomposicion.
- Bloques: tendencia de peso + media movil, cintura y grasa corporal, deltas semanales, ETA de meta.

4. Rendimiento Nutricional
- Objetivo: adherencia de calorias y macros.
- Bloques: cumplimiento 7d/30d, distribucion por comida, alimentos top, dias por debajo/encima.

5. Consistencia y Rachas
- Objetivo: gamificacion de adherencia.
- Bloques: timeline de racha, heatmap de cumplimiento, ranking de metricas, score semanal.

6. Coaching / Revision Semanal
- Objetivo: retrospectiva accionable.
- Bloques: logros, cuellos de botella, metas falladas, insights automaticos, recomendaciones de la semana.

## 3) Orden de implementacion

1. Reemplazar `Statistics` por cards/charts Tremor.
2. Evolucionar `Analytics` en Inicio hacia Command Center + Recovery.
3. Agregar dashboard de Consistencia (calendario + racha + cumplimiento).
4. Agregar dashboard de Nutricion.
5. Integrar Weekly Review en un dashboard de coaching.
