# pi-custom-gentle

Extensión de Pi/Gentle Shell para overlays de prompts personalizables mediante parches Markdown. **Incluye 3 skills nativas empaquetadas para Custom ODD workflow.**

## Instalación

```bash
# Instalar desde GitHub (rama principal)
gentle-shell install git:github.com/AndyTechnologies/pi-custom-gentle@main

# Para una versión específica (después de crear tags):
# gentle-shell install git:github.com/AndyTechnologies/pi-custom-gentle@v0.1.0
```

## Habilidades nativas empaquetadas

Esta extensión distribuye 3 skills como recursos nativos del paquete. Tras instalar desde GitHub, están disponibles automáticamente sin pasos adicionales:

### 1. `custom-odd-product-quest`
**Activación:** `/product-quest`, trigger: `product-quest`
**Responsabilidad:** Detectar gaps de producto, documentar decisiones bajo `## Product Contract` con cláusulas `PC-01`, `PC-02`, etc., y usar `ask_user_question`/`ask_user_choice` nativas para entrevistas al usuario.

**Cuándo usar:**
- Starting a new ODD task con product/domain uncertainty
- User request involves feature scope, user flows, domain rules
- Architecture Quest identifies product/domain gaps
- During development, new product questions arise

**No usar para:**
- Purely technical architecture decisions (use custom-odd-architecture-quest)
- Implementation-only tasks con requisitos asentados
- UI/UX design decisions sin impacto de dominio

### 2. `custom-odd-architecture-quest`
**Activación:** `/architecture-quest`, trigger: `architecture-quest`
**Responsabilidad:** Identificar gaps arquitectónicos, documentar decisiones bajo `## Architectural Contract` con cláusulas `AC-01`, `AC-02`, etc., y usar herramientas nativas para decisiones al usuario.

**Cuándo usar:**
- Task may have material architectural consequences
- New feature crossing module boundaries
- Substantial data model changes
- New external integrations
- Authentication/authorization/secrets changes

**No usar para:**
- Local modifications, trivial fixes, documentación-only changes sin impacto estructural
- Tasks donde la arquitectura ya esté asentada por convenciones existentes

### 3. `quests-interview`
**Activación:** `/interview`, trigger: `interview`
**Responsabilidad:** Entrevista bounded usando herramientas nativas de Gentle Shell, máximo 50 preguntas, una a la vez. Usada por Product Quest y Architecture Quest para decisiones humanas que bloquean el planning.

**Hard Rules:**
- Hard question budget = 50
- One question at a time
- Orchestrator-owned only
- User-invoked or blocking-only
- Facts are the job (dispatch sub-agents, don't ask user)
- No stack/framework drag

**Cuándo usar:**
- Product Quest/Architecture Quest identifican gap bloqueante
- Usuario solicita explícitamente una entrevista
- Se neceshan decisiones humanas para desbloquear planning

**No usar para:**
- Autentic model invocation (deshabilitado)
- Continuous or unbounded interviewing
- Replacing grill-me entry point

## Modo custom-odd

Gestiona la activación/desactivación de overlays de prompts con precedencia:

```bash
/custom-odd on          # Activa en esta sesión
/custom-odd off         # Desactiva en esta sesión
/custom-odd inherit     # Hereda configuración global
/custom-odd always on   # Siempre activo (global)
/custom-odd always off  # Siempre desactivado (global)
/custom-odd status      # Mostrar estado actual
```

## Inspección de prompts

```bash
/prompt inspect orchestrator    # Inspeccionar prompt principal
/prompt inspect nombre_agente   # Inspeccionar agente específico
/prompt export orchestrator     # Exportar captura a archivos
/prompt diff explorer           # Mostrar diff de últimos cambios
/prompt sources orchestrator    # Mostrar fuentes (skills, herramientas, etc.)
```

## Parches Markdown

Los parches usan directivas en archivos `*.md`:

```markdown
<!-- replace:2:4 -->
Contenido que reemplaza las líneas 2 a 4 (inclusive).

<!-- add:3 -->
Contenido insertado antes de la línea 3.
```

## Arquitectura

Siete componentes principales:

1. **Patch Engine**: Motor independiente que interpreta y aplica directivas Markdown (`replace`/`add`), con validación de solapamientos y huellas de compatibilidad.

2. **State Manager**: Gestión de modo custom-odd con precedencia sesión/global y persistencia via `pi.appendEntry`.

3. **Prompt Inspector**: Comandos (`inspect/export/diff/sources`) que capturan tres niveles de prompt:
   - Nivel 1: prompt estructurado (before_agent_start)
   - Nivel 2: prompt encadenado (before/after patches)
   - Nivel 3: payload proveedor (before_provider_request)

4. **Adapters**:
   - `pi-primary`: Se integra al evento `before_agent_start` del orquestador principal.
   - `gentle-agents`: Se ejecuta en procesos hijos vía inyección de paquetes, identificando agentes por huella y ruta.

5. **Prompt Registry**: Registro de qué parches corresponden a cada agente (IDs, adaptadores, prioridades, enabled flag).

6. **Custom ODD Skills**: Tres skills empaquetadas (`custom-odd-product-quest`, `custom-odd-architecture-quest`, `quests-interview`) que proporcionan metodologías completas de decisiones de producto y arquitectura, más la entrevista bounded nativa.

7. **Changelog & Versioning**: `CHANGELOG.md` con formato Keep a Changelog 1.0.0 y `Semantic Versioning 2.0.0`.

## Desarrollo

Estructura de directorios:

```
pi-custom-gentle/
├── package.json              # Raíz con config pi.extensions y skills declaration
├── extensions/pi-custom-gentle.ts    # Punto de entrada de la extensión
├── src/
│   ├── core/           # Patch-parser, patch-engine, patch-registry
│   ├── adapters/       # pi-primary, gentle-agents
│   ├── state/          # state-manager (custom-odd mode)
│   ├── inspection/     # prompt-inspector (inspect/export/diff/sources)
│   └── commands/       # Comandos /custom-odd, /prompt
├── patches/            # Archivos Markdown con directivas
│   └── custom-odd/
│       ├── orchestrator.md
│       └── agents/
│           ├── explorer.md
│           └── ...
├── tests/              # Pruebas unitarias e integración
│   └── unit/
│       └── parser-test.cjs
├── odd/                # Documentación ODD (specs, tasks, log)
├── skills/             # Skills nativas empaquetadas
│   ├── custom-odd-product-quest/
│   │   ├── SKILL.md
│   │   └── references/
│   │     └── product-gap-categories.md
│   ├── custom-odd-architecture-quest/
│   │   ├── SKILL.md
│   │   └── references/
│   │     └── design-degradation.md
│   └── quests-interview/
│       ├── SKILL.md
│       ├── references/
│       └── assets/
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Casos de aceptación

- Instalación desde GitHub en home aislado y enlazado → las 3 skills se descubren automáticamente
- Activación ON/OFF/INHERIT y global `always` → custom-odd mode management
- Sesiones: reiniciar, reanudar, bifurcar y navegar con `/tree`
- Orquestador: prompt original y transformado comparables via `/prompt inspect`
- Subagentes: worker, explorer y verifier reales con identificación por huella
- Herencia: estado del padre recibido por los hijos mediante persistencia `pi.appendEntry`
- Identificación: rechazar definiciones ambiguas o desconocidas
- Parches: rangos, anclas, conflictos y documentos modificados
- Inspector: distinguir prompt, prompt encadenado y payload
- Privacidad: no guardar payload sensible sin consentimiento
- Actualizaciones: detectar cambios incompatibles en prompts upstream
- Skills: frontmatter válido, nombres y directorios coinciden, descripciones con triggers adecuados
- No se conservan rutas absolutas de desarrollo
- No quedan referencias obsoletas a `quest-interview`
- `grill-me` no se invoca automáticamente
- No se duplican contratos de Gentle Shell
- Las reglas de changelog y SemVer son consistentes

## Flujo Custom ODD obligatorio

1. **Authorizing** - Determinar alcance y resultado esperado
2. **Exploring** - Inspeccionar código, requisitos, documentación
3. **Product Quest** - Resolver gaps de producto vía `custom-odd-product-quest`, producir `## Product Contract`
4. **Architecture Quest** - Resolver gaps arquitectónicos vía `custom-odd-architecture-quest`, producir `## Architectural Contract`
5. **Classify** - Siempre clasificar como `substantial task`
6. **Tracking** - Usar `orchestrator-memory.md` como contrato de persistencia
7. **Design and Plan** - Revisar decisiones previas, definir tareas y dependencias, obtener aprobación del usuario
8. **Implement** - Priorizar tareas independientes, workers para codificación
9. **Verify** - Verificar cada tarea frente a requisitos y contratos
10. **Changelog** - Documentar cambios notables en `Unreleased`, seguir Keep a Changelog 1.0.0
11. **Close** - Reconciliar tareas, memoria, decisiones

**Overrides explícitos:**
- Todos los trabajos se clasifican como `substantial task`
- Todos los trabajos reciben tracking ODD

Las restantes reglas de Gentle Shell continúan siendo la autoridad para autorización, seguridad, delegación, memoria, RDD y cierre.

## Versión actual

`0.1.0` - Versión inicial con skills empaquetadas y overlay Custom ODD.