# Scan Project Report

## Objetivo

Este documento resume el diagnóstico técnico inicial del repositorio AppFit y sirve como punto de arranque para los agentes especializados definidos en `C:\Users\STEVAN\Documents\GitHub\agents`.

## Resumen Ejecutivo

El proyecto tiene una base funcional clara y ya opera en producción, pero presenta deuda estructural en cuatro frentes:

1. configuración y seguridad básica del repositorio
2. acoplamiento y tamaño de módulos clave
3. duplicación de infraestructura de acceso a Supabase
4. baja formalización de contratos y de pruebas sobre flujos críticos

No parece necesario un rediseño total del sistema. La estrategia correcta es refactor incremental guiado por módulos.

## Stack Detectado

- React 18
- TypeScript
- Vite 5
- Tailwind CSS
- shadcn/ui + Radix UI
- React Query
- Supabase Auth / DB / Storage
- Vitest + Testing Library
- Docker + Nginx
- Dokploy

## Huella del Repositorio

- Archivos en `src/`: 167
- Tests detectados: 6
- SQL scripts de Supabase mantenidos en raíz: múltiples
- Documentación base de agentes: ya creada en `docs/`

## Estructura Actual

### Fortalezas

- Separación reconocible entre `pages`, `components`, `services`, `features`, `context`, `routes`
- Hay esfuerzo visible por aislar lógica reutilizable en `features` y `services`
- Existe una capa de tests sobre utilidades y algunos servicios
- La estrategia de deploy ya quedó funcional para SPA con Docker + Nginx

### Debilidades

- Algunos módulos concentran demasiadas responsabilidades
- El sistema mezcla lógica de dominio, acceso a datos, guest mode y adaptación UI en archivos muy grandes
- No hay aún una organización modular por dominio
- El repositorio seguía con README boilerplate y sin runbook formal hasta esta intervención

## Hallazgos Priorizados

### Critical

#### 1. `.env` no está ignorado por Git

Evidencia:

- existe `.env` en la raíz
- `.gitignore` no contiene `.env` ni `.env.*`

Impacto:

- riesgo de commit accidental de credenciales
- alto riesgo operativo y de seguridad

Remediación:

- agregar reglas de ignore
- revisar historial si alguna credencial ya fue committeada
- usar `.env.example` sin valores reales

### High

#### 2. Múltiples clientes Supabase

Evidencia:

- `src/services/supabaseClient.ts`
- `src/services/supabase/client.ts`
- `src/integrations/supabase/client.ts`

Impacto:

- deriva de configuración
- riesgo de importar el cliente incorrecto
- mayor costo de mantenimiento

Remediación:

- definir un solo cliente canónico
- convertir duplicados en re-export temporal o eliminarlos

#### 3. Archivos demasiado grandes en zonas críticas

Evidencia destacada:

- `src/pages/Training.tsx` ~70 KB
- `src/services/nutrition.ts` ~54 KB
- `src/pages/Nutrition.tsx` ~53 KB
- `src/services/training.ts` ~50 KB
- `src/pages/Calendar.tsx` ~45 KB
- `src/pages/Stats.tsx` ~40 KB
- `src/context/AuthContext.tsx` ~20 KB pero con alta centralidad

Impacto:

- onboarding lento para nuevos cambios
- bugs más difíciles de aislar
- más regresiones en refactors

Remediación:

- dividir por dominio funcional
- extraer validadores, adaptadores, mutaciones y componentes de presentación

### Medium

#### 4. TypeScript relajado

Evidencia en `tsconfig.json`:

- `noImplicitAny: false`
- `strictNullChecks: false`
- `allowJs: true`
- `noUnusedLocals: false`

Impacto:

- menor protección contra regresiones
- errores de nulabilidad más probables

Remediación:

- endurecer gradualmente por áreas
- no hacer switch global de una sola vez

#### 5. Uso intensivo y disperso de `localStorage`

Evidencia:

- guest mode y preferencias están distribuidos en `context` y múltiples `services`

Impacto:

- duplicación de persistencia
- claves distribuidas en muchos archivos
- más dificultad para limpiar, migrar o versionar almacenamiento local

Remediación:

- centralizar helpers de storage
- definir catálogo de keys
- desacoplar guest persistence por dominio

#### 6. RPCs de Supabase sin documentación central

RPC detectadas:

- `reset_user_day`
- `reset_user_history`
- `reset_user_account`
- `save_workout_with_exercises`
- `start_workout_session_safe`

Impacto:

- dependencia implícita de backend no evidente desde la app
- despliegues pueden romperse si la base no está alineada

Remediación:

- documentar contratos y prerequisitos de SQL/RPC
- agrupar scripts por dominio y orden de aplicación

### Low

#### 7. README desactualizado

Impacto:

- onboarding deficiente
- falsa referencia a Lovable como fuente principal de operación

Remediación:

- reemplazarlo por uno centrado en AppFit real

## Riesgos Técnicos por Área

### Frontend

- páginas demasiado grandes
- mezcla de UI y lógica de dominio
- crecimiento de complejidad sin límites claros de módulo

### Data / Supabase

- scripts SQL dispersos en raíz
- RPCs y tablas sin índice documental único
- cliente Supabase duplicado

### Infra / Deploy

- dependencia fuerte de build args correctos en Dokploy
- sensibilidad a caché de navegador post-deploy
- flujo de email depende todavía del built-in SMTP si no se configura proveedor externo

### Seguridad

- manejo de `.env` insuficiente
- necesidad de revisar historial si hubo exposición accidental
- futuro riesgo alto si se añaden claves backend sin separar responsabilidades

## Mapa de Prioridades

### Fase 1: Endurecimiento base

1. ignorar `.env`
2. crear `.env.example`
3. reemplazar README boilerplate
4. unificar cliente Supabase

### Fase 2: Refactor de bordes críticos

1. dividir `AuthContext` en auth session + profile sync + guest mode
2. extraer módulos internos de `training.ts`
3. dividir `Training.tsx` en subcomponentes y hooks
4. aplicar el mismo patrón a nutrición

### Fase 3: Modularización por dominio

Objetivo recomendado:

- `src/modules/auth`
- `src/modules/dashboard`
- `src/modules/nutrition`
- `src/modules/training`
- `src/modules/recovery`
- `src/modules/profile`

Cada módulo con:

- components
- hooks
- services
- validators
- types
- tests

### Fase 4: Calidad y contratos

1. ampliar tests de auth, routing y servicios críticos
2. documentar RPCs y orden de scripts SQL
3. endurecer TypeScript progresivamente

## Agentes Recomendados por Fase

### Fase 1

- `cybersecurity_agent`
- `refactor_agent`
- `devops_agent`

### Fase 2

- `cto_agent`
- `architecture_agent`
- `frontend_agent`
- `backend_agent`
- `qa_agent`

### Fase 3

- `architecture_agent`
- `refactor_agent`
- `frontend_agent`
- `backend_agent`

### Fase 4

- `qa_agent`
- `debugging_agent`
- `cybersecurity_agent`

## Recomendación Final

La mejor forma de volver sólida la app es evitar un refactor masivo. El orden correcto es:

1. asegurar repositorio y secretos
2. consolidar infraestructura de acceso a datos
3. refactorizar un dominio grande a la vez
4. subir el estándar de tipos y tests después de estabilizar los bordes

El mejor primer dominio para intervenir es `auth`, seguido por `training`, porque ambos combinan alto impacto funcional con alta centralidad técnica.
