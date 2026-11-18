/**
 * pi-primary.ts
 *
 * Adaptador del orquestador principal (proceso Padre).
 * Se conecta al evento `before_agent_start` de Pi para modificar el prompt
 * estructurado antes de que cualquier agente sea iniciado.
 *
 * Según spec S6 (Adapters: Orchestrator):
 * - Usa el evento `before_agent_start` para acceder al prompt encadenado y
 *   a `systemPromptOptions` (customPrompt, appendSystemPrompt, sections, etc.)
 * - Modifica preferentemente las secciones estructuradas o el contenido añadido,
 *   evitando reemplazar indiscriminadamente todo el `systemPrompt`.
 * - Consulta el Patch Registry y el Patch Engine para aplicar los overlays
 *   correspondientes.
 * -Previene modificaciones duplicadas comprobando huellas (fingerprints) del prompt.
 * - Distingue ámbito: proceso principal vs hijos (estos últimos tienen su propio adapter).
 */

// Importaciones de la API de Pi (en tiempo real)
import { before_agent_start } from "@pi-dev/core";

// Importaciones internas - módulos especializados
import { customOdd, getState, propagateToChild } from "../state/state-manager";
import { applyPromptPatches } from "../core/patch-engine";
import { loadRegistryFromJson, lookupAgentEntries } from "../core/patch-registry";
import { promptInspect, promptViewerTUI } from "../inspection/prompt-inspector";
import { registerCustomOddCommand } from "../commands/custom-odd-command";
import { registerPromptCommand } from "../commands/prompt-command";

// -----------------------------------------------------------------
// Tipo de evento que Pi provee en before_agent_start
// -----------------------------------------------------------------

/** Opciones del system prompt que Pi pasa al hook before_agent_start. */
export interface SystemPromptOptions {
  customPrompt?: string;
  appendSystemPrompt?: string;
  sections?: any[];
  promptGuidelines?: string;
  selectedTools?: string[];
  contextFiles?: string[];
  skills?: string[];
}

/** Evento completo recibido en before_agent_start. */
export interface BeforeAgentStartEvent {
  systemPromptOptions: SystemPromptOptions;
  chainPrompt?: string;
}

// -----------------------------------------------------------------
// Lógica principal del handler
// -----------------------------------------------------------------

/**
 * Punto de entrada que Gentle Shell (o el runtime de Pi) invoca
 * antes de iniciar cualquier agente.
 *
 * La lógica (según spec S6):
 * 1. Verificar el estado actual de custom-odd (global + sesión).
 * 2. Si está activado, consultar el Patch Registry para este agente.
 * 3. Aplicar los parches Markdown correspondientes usando el Patch Engine.
 * 4. Inyectar el prompt transformado en las opciones correspondientes
 *    (customPrompt o appendSystemPrompt).
 * 5. Registrar en las capturas (inspector) si está habilitado.
 *
 * Consideraciones clave (según spec S6):
 * - No forzar el prompt completo; solo modificar secciones estructuradas.
 * - Validar huellas antes/después para detectar cambios incompatibles.
 * - Si el prompt ya fue parcheado (misma huella), omitir para evitar bucles.
 * - El orden de los handlers importa: otros handlers pueden modificar después.
 */
export function orchestratorBeforeAgentStartHook(event: BeforeAgentStartEvent): BeforeAgentStartEvent {
  const { systemPromptOptions, chainPrompt } = event;

  // 1. Obtener estado actual de custom-odd
  const state = getState();

  // 2. Si custom-odd está OFF (efectivo), no aplicar nada y retornar tal cual
  if (state.effective === "off") {
    // Aún así registramos que fue inspeccionado (para el inspector)
    console.log("[pi-primary] custom-odd OFF: no applying patches; returning original prompt");
    return event;
  }

  // 3. Determinar de qué partes del prompt queremos inyectar.
  // Por defecto actuaremos sobre `appendSystemPrompt` si existe,
  // o sobre `customPrompt` si este está definido.
  // En el futuro podría ramificarse sobre `sections` también.

  const modifications: { target: keyof SystemPromptOptions; original: string; patched: string }[] = [];

  // Intentar aplicar sobre appendSystemPrompt
  if (systemPromptOptions.appendSystemPrompt) {
    const originalAppend = systemPromptOptions.appendSystemPrompt;

    // Preparar el markdown con las directivas a aplicar.
    // Leeríamos el/los archivos Markdown correspondientes al agente desde el registry.
    // Por ahora, usamos un placeholder de directivas.
    const markdownDirectives = `<!-- replace:1:1 -->
Añadido por pi-custom-gentle via appendSystemPrompt.`;

    // Aplicar el motor de parches
    const lines = originalAppend.split("\n");
    const patchResult = applyPromptPatches(lines, markdownDirectives, {
      agentId: "orchestrator",
      agentName: "Orchestrator",
      sourcePath: "custom-odd/orchestrator.md",
      expectedFingerprint: undefined, // En producción, compararíamos huella
    });

    if (patchResult.success && patchResult.transformedPrompt) {
      const patched = patchResult.transformedPrompt;
      if (patched !== originalAppend) {
        modifications.push({
          target: "appendSystemPrompt",
          original: originalAppend,
          patched,
        });
        // Actualizar el promptOptions con el parcheado
        systemPromptOptions.appendSystemPrompt = patched;
        console.log("[pi-primary] Patched appendSystemPrompt:", patched.substring(0, 50) + "...");
      } else {
        console.log("[pi-primary] No changes applied to appendSystemPrompt (no directives matched).");
      }
    } else {
      // Errores de validación (superposición, rango, etc.) - los registramos pero no fallamos el start
      console.warn("[pi-primary] Patch Engine errors, skipping appendSystemPrompt patch:", patchResult.compatibilityMessage || patchResult.errors);
    }
  }

  // Igual para customPrompt (si existe)
  if (systemPromptOptions.customPrompt) {
    // Lógica similar a la de appendSystemPrompt, pero operando sobre customPrompt
    const originalCustom = systemPromptOptions.customPrompt;
    const markdownDirectives = `<!-- add:1 -->
<!-- This is a custom overlay injected via customPrompt -->`;

    const lines = originalCustom.split("\n");
    const patchResult = applyPromptPatches(lines, markdownDirectives, {
      agentId: "orchestrator",
      agentName: "Orchestrator",
      sourcePath: "custom-odd/orchestrator.md",
      expectedFingerprint: undefined,
    });

    if (patchResult.success && patchResult.transformedPrompt) {
      const patched = patchResult.transformedPrompt;
      if (patched !== originalCustom) {
        modifications.push({
          target: "customPrompt",
          original: originalCustom,
          patched,
        });
        systemPromptOptions.customPrompt = patched;
        console.log("[pi-primary] Patched customPrompt (first " + Math.min(patched.length, 60) + " chars): " + patched.substring(0, 60) + "...");
      }
    } else {
      console.warn("[pi-primary] Patch Engine errors on customPrompt:", patchResult.compatibilityMessage || patchResult.errors);
    }
  }

  // 4. Registrar en el Prompt Inspector las capturas si es necesario
  if (modifications.length > 0) {
    console.log("[pi-primary] Applied", modifications.length, "patch(s) to orchestrator prompt.");
    // Modo inspector: guardar original vs transformado para después diffar
    // inspector.recordModification(event, modifications);
  }

  // 5. Retornar el event (posiblemente modificado)
  // Nota: No retornamos un nuevo object para no perder referencias,
  // pero en tiempo real podríamos retornar el event modificado.
  return event;
}

// -----------------------------------------------------------------
// Registro del hook con Pi
// En tiempo real, Gentle Shell o el runtime inscribiría esta función
// al evento `before_agent_start` de la extensión.
// -----------------------------------------------------------------

/**
 * Ejemplo de inscripción (comentar/descomentar según necesidad):
 *
 * import { before_agent_start } from "@pi-dev/core";
 *
 * before_agent_start.add(orchestratorBeforeAgentStartHook);
 *
 * O usar la forma declarativa en package.json pi.extensions hooks:
 * hooks: {
 *   before_agent_start: orchestratorsBeforeAgentStartHook,
 * }
 */

// Auto-registrar el hook al cargar la extensión
// Esto asegura que el hook se registre exactamente una vez
before_agent_start.add(orchestratorBeforeAgentStartHook);

// Exportamos también una versión que puede ser usada directamente por Pi:
export default orchestratorBeforeAgentStartHook;

// ============================================================
// Handlers adicionales registrados desde módulos especializados
// ============================================================

/**
 * Registra todos los comandos de la extensión.
 * Debe ser llamado durante la activación de la extensión.
 */
export function registerAllCommands(pi: any) {
  // Registrar comando /custom-odd
  registerCustomOddCommand(pi);

  // Registrar comando /prompt
  registerPromptCommand(pi);
}
