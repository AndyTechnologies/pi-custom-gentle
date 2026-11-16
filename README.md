# pi-custom-gentle

Extensión de Pi/Gentle Shell para overlays de prompts personalizables mediante parches Markdown.

## Instalación

```bash
# Instalar desde GitHub (rama principal)
gentle-shell install git:github.com/AndyTechnologies/pi-custom-gentle@main

# Para una versión específica (después de crear tags):
# gentle-shell install git:github.com/AndyTechnologies/pi-custom-gentle@v0.1.0
```

## Funcionalidades

### Modo custom-odd

Gestiona la activación/desactivación de overlays de prompts con precedencia:

```bash
/custom-odd on          # Activa en esta sesión
/custom-odd off         # Desactiva en esta sesión
/custom-odd inherit     # Hereda configuración global
/custom-odd always on   # Siempre activo (global)
/custom-odd always off  # Siempre desactivado (global)
/custom-odd status      # Mostrar estado actual
```

### Inspección de prompts

```bash
/prompt inspect orchestrator    # Inspeccionar prompt principal
/prompt inspect nombre_agente   # Inspeccionar agente específico
/prompt export orchestrator     # Exportar captura a archivos
/prompt diff explorer           # Mostrar diff de últimos cambios
/prompt sources orchestrator    # Mostrar fuentes (skills, herramientas, etc.)
```

### Parches Markdown

Los parches usan directivas en archivos `*.md`:

```markdown
<!-- replace:2:4 -->
Contenido que reemplaza las líneas 2 a 4 (inclusive).

<!-- add:3 -->
Contenido insertado antes de la línea 3.
```

## Arquitectura

Cinco componentes principales:

1. **Patch Engine**: Motor independiente que interpreta y aplica directivas Markdown (`replace`/`add`), con validación de solapamientos y huellas de compatibilidad.

2. **State Manager**: Gestión de modo custom-odd con precedencia sesión/global y persistencia via `pi.appendEntry`.

3. **Prompt Inspector**: Cuatro comandos (`inspect/export/diff/sources`) que capturan tres niveles de prompt:
   - Nivel 1: prompt estructurado (before_agent_start)
   - Nivel 2: prompt encadenado (before/after patches)
   - Nivel 3: payload proveedor (before_provider_request)

4. **Adapters**:
   - `pi-primary`: Se integra al evento `before_agent_start` del orquestador principal.
   - `gentle-agents`: Se ejecuta en procesos hijos vía inyección de paquetes, identificando agentes por huella y ruta.

5. **Prompt Registry**: Registro de qué parches corresponden a cada agente (IDs, adaptadores, prioridades, enabled flag).

## Desarrollo

Estructura de directorios:

```
pi-custom-gentle/
├── package.json              # Raíz con config pi.extensions
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
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## Casos de aceptación (Fase 8 pending)

- Instalación desde GitHub en home aislado y enlazado
- Activación ON/OFF/INHERIT y global `always`
- Sesiones: reiniciar, reanudar, bifurcar y navegar con `/tree`
- Orquestador: prompt original y transformado comparables
- Subagentes: worker, explorer y verifier reales
- Herencia: estado del padre recibido por los hijos
- Identificación: rechazar definiciones ambiguas o desconocidas
- Parches: rangos, anclas, conflictos y documentos modificados
- Inspector: distinguir prompt, prompt encadenado y payload
- Privacidad: no guardar payload sensible sin consentimiento
- Actualizaciones: detectar cambios incompatibles en prompts upstream