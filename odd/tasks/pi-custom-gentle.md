# pi-custom-gentle ODD Implementation Plan

## Specs

S1: Repositorio distribuido desde GitHub sin publicar en npm. Instalación mediante `gentle-shell install git:github.com/AndyTechnologies/pi-custom-gentle@main`.

S2: Estructura actual tiene `extension/` subdirectorio con `package.json` interno, `manifest.json` redundante y `src/index.js` con firma `activate()`/`deactivate()`. Se deben mover a raíz, unificar identidad a `pi-custom-gentle` y convertir a extensión Pi válida.

S3: Arquitectura de cinco componentes: pi-custom-gentle (extensión principal), State Manager, Prompt Registry, Patch Engine, Adapters (orquestador y subagentes).

S4: Patch Engine leerá prompts originales, interpretará directivas Markdown (`replace`/`add` por rango/áncora), resolverá parches, aplicará transformaciones deterministas, validará compatibilidad y producirá prompt transformado + diff.

S5: Prompt Registry indicará qué parches corresponden a cada agente con IDs, adapters, nombres, prioridades y enabled flag. Ejemplo conceptual con targets orchestrator y explorer.

S6: Adaptador orquestador usará evento `before_agent_start` de Pi para modificar prompt estructurado (`systemPromptOptions`: customPrompt, appendSystemPrompt, sections, promptGuidelines, selectedTools, contextFiles, skills).

S7: Adaptador Gentle Agents se ejecutará en procesos hijos mediante inyección de paquetes. Debe identificar definiciones de agente por huella y ruta origen, rechazar definiciones ambiguas o incompatibles. Distinguir ámbitos: proceso principal vs hijos.

S8: Sistema de activación `custom-odd` con comandos `/custom-odd on/off/inherit/always on/always off/status`. Precedencia: override sesión > configuración global always. Persistencia mediante `pi.appendEntry("custom-odd.state/v1", ...)`.

S9: Prompt Inspector con comandos `/prompt inspect/export/diff/sources/payload`. Tres niveles de captura: prompt estructurado (before_agent_start), prompt encadenado (before/after patches), payload proveedor (before_provider_request). Exportación a `captures/session-id/agent/`.

S10: Estructura final del repositorio con `package.json` raíz con config `pi.extensions`, `extensions/pi-custom-gentle.ts`, `src/core/`, `src/adapters/`, `src/state/`, `src/inspection/`, `src/commands/`, `patches/`, `tests/`, `docs/`.

S11: Plan de implementación por fases (0-7) que evita parches reales hasta tener inspección de prompts y mecanismo validado.

S12: Estrategia de pruebas y compatibilidad con matriz de casos de aceptación: instalación, activación, sesiones, orquestador, subagentes, herencia, identificación, parches, inspector, privacidad, actualizaciones.

## Tasks

T1: Preparación del paquete GitHub - mover package.json a raíz, eliminar manifest.json redundante, convertir src/index.js a extensión Pi, agregar config `pi.extensions`, commit y push a main.

T2: Implementar Core y Patch Engine - parser Markdown directivas `replace`/`add`, validación directivas, detección solapamientos, aplicación atómica, Prompt Registry básico. Cubrir con pruebas unitarias.

T3: Implementar State Manager - configuración global, overrides sesión, precedencia `/custom-odd` comandos, persistencia por rama (`pi.appendEntry`), propagación estado al proceso hijo. Cierre: funciona tras reinicios, forks, clones, navegación ramas.

T4: Adaptador orquestador - integración `before_agent_start`, identificación prompt principal, aplicación conjunto parches, prevención modificaciones duplicadas, validación orden handlers.

T5: Adaptador Gentle Agents - detectar procesos hijos, identificar definición agente original por huella/ruta, resolver nombre y fuentes, aplicar parches correspondientes, registrar capturas por hijo, pruebas con agentes reales.

T6: Prompt Inspector - implementar `/prompt inspect/export/diff/sources/payload`. Captura tres niveles: estructurado, encadenado, payload proveedor. Exportación privada/optativa con límites tamaño. Cierre: reconstruir instrucciones recibidas por cada agente.

T7: Parches iniciales custom-odd - inspeccionar prompt real orquestador, inspeccionar instrucciones subagentes, diseñar parches sobre capturas, validar compatibilidad con definiciones existentes. Cierre: conjunto inicial documentado y verificable.

T8: CI y distribución - typecheck, pruebas unitarias e integración, verificación manifiesto Pi, pruebas paquete desde Git, publicación releases con tags, documentación instalación/actualización. Cierre: usuario instala/actualiza/elimina reproducible.

T9: Tests de compatibilidad - adaptadores versionados, detección cambios mecanismo descubrimiento agentes, estructura instrucciones hijas, carga extensiones hijas. Fallo cerrado sin modificar código oficial.

T10: Refinamiento final y documentación - consolidar arquitectura, actualizar docs, verificar todos los criterios de cierre de fases.

## Log

L1: User request: "estamos en una carpeta vacía, inicializa el proyecto para una extension de gentle-shell, debes crear el repositorio, la estructura de carpetas y configuraciones minimas funcionales." Then: "crea el repositorio en mi githubremoto" then: plan de implementación detallado con arquitectura, fases, decisiones y estrategia de pruebas.