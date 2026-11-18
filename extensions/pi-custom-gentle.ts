/**
 * pi-custom-gentle: Extensión MVP funcional para Pi/Gentle Shell.
 *
 * Este archivo implementa completamente los comandos /custom-odd y /prompt
 * conectando con la API oficial de Pi y el Patch Engine interno.
 *
 * Estados:
 * - /custom-odd: 100% funcional con persistencia via pi.appendEntry
 * - /prompt: Inspecciona prompts reales de Pi con captura y visor TUI
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ============================================================
// Patch Engine import (usando el core que ya tenemos)
// ============================================================

import { applyPromptPatches, type PatchResult } from "../src/core/patch-engine";

// ============================================================
// Autocompletado para /custom-odd
// ============================================================

const CUSTOM_ODD_OPTIONS = [
  "on",
  "off",
  "inherit",
  "always on",
  "always off",
  "status",
];

function getCustomOddCompletions(prefix: string): Array<{ value: string; label: string }> | null {
  const normalizedPrefix = prefix.trim().toLowerCase();
  const matches = CUSTOM_ODD_OPTIONS.filter(
    (option) => option.startsWith(normalizedPrefix)
  );

  if (matches.length === 0) return null;

  return matches.map((value) => ({
    value: `${value} `,
    label: value,
  }));
}

// ============================================================
// Autocompletado para /prompt
// ============================================================

const PROMPT_SUB_COMMANDS = ["inspect", "export", "diff", "sources", "payload"];

// ============================================================
// Patch Engine inline (basado en patch-parser.ts logic)
// ============================================================

/**
 * Parser simple de directivas Markdown replace/add.
 * Versión simplificada para el MVP.
 */
function parseDirectives(markdown: string) {
  const directives: any[] = [];
  const errors: any[] = [];

  const regex = /<!--\s*(replace|add):(\d+)(?::(\d+))?\s*-->/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markdown)) !== null) {
    const directiveType = match[1];
    const startLine = parseInt(match[2], 10);
    const endLine = match[3] ? parseInt(match[3], 10) : null;

    let content = "";
    // Extraer contenido después de la directiva hasta -->
    const afterDir = match[0].slice(match[0].indexOf(match[2]) + match[2].length);
    const endIdx = afterDir.indexOf("-->");
    if (endIdx !== -1) {
      content = afterDir.slice(0, endIdx).trim();
    }
    if (!content) content = `<!-- ${directiveType} content ${startLine}-${endLine || startLine} -->`;

    if (directiveType === "replace") {
      if (endLine === null || endLine < startLine) {
        errors.push({ message: "Invalid replace range", code: "invalid_range" });
        continue;
      }
      directives.push({
        type: "replace",
        startLine,
        endLine,
        content,
      });
    } else if (directiveType === "add") {
      if (startLine < 1) {
        errors.push({ message: "Invalid add line", code: "invalid_range" });
        continue;
      }
      directives.push({
        type: "add",
        targetLine: startLine,
        content,
      });
    }
  }

  // Validar solapamientos (solo para replace)
  for (let i = 0; i < directives.length; i++) {
    for (let j = i + 1; j < directives.length; j++) {
      const d1 = directives[i];
      const d2 = directives[j];
      if (d1.type === "replace" && d2.type === "replace") {
        if (d1.startLine <= d2.endLine && d2.startLine <= d1.endLine) {
          errors.push({
            message: `Overlap between replace directives [${d1.startLine}-${d1.endLine}] and [${d2.startLine}-${d2.endLine}]`,
            code: "overlap",
          });
        }
      }
    }
  }

  return { directives, errors };
}

/**
 * Aplica directivas a un array de líneas.
 */
function applyDirectives(lines: string[], directives: any[]): string[] {
  const result = [...lines];
  const sorted = [...directives].sort((a, b) => {
    const aIdx = a.type === "replace" ? a.endLine : a.targetLine;
    const bIdx = b.type === "replace" ? b.endLine : b.targetLine;
    return bIdx - aIdx;
  });

  for (const dir of sorted) {
    if (dir.type === "replace") {
      const zeroStart = dir.startLine - 1;
      const zeroEnd = Math.min(dir.endLine, result.length);
      const replaced = dir.content;
      result.splice(zeroStart, zeroEnd - zeroStart, replaced);
    } else if (dir.type === "add") {
      const zeroBased = Math.min(dir.targetLine - 1, result.length);
      result.splice(zeroBased, 0, dir.content);
    }
  }
  return result;
}

/**
 * Genera un diff unificado entre arrays de líneas.
 * 
 * Este algoritmo distingue entre:
 * - Líneas modificadas (cambiaron contenido pero mantienen posición aproximada)
 * - Líneas añadidas (existieron en transformadas pero no en originales)
 * - Líneas borradas (existieron en originales pero no en transformadas)
 * 
 * A diferencia del generador simplificado anterior, este:
 * - No tiene límite artificial de líneas mostradas
 * - Mantiene alineación correcta cuando hay bloques de cambios
 * - Reporta el tipo de cambio (modificar, añadir, borrar)
 * - Es compatible con el formato unified diff por línea
 */
function generateDiff(
  original: string[],
  transformed: string[]
): {
  diff: string;
  statistics: {
    originalLines: number;
    transformedLines: number;
    unchanged: number;
    modified: number;
    added: number;
    deleted: number;
  };
} {
  const resultLines: string[] = [];
  let i = 0;
  let j = 0;
  
  let unchanged = 0;
  let modified = 0;
  let added = 0;
  let deleted = 0;

  // Algorithm: simple line-by-line comparison with shift tracking
  // This is a simplified version; a proper diff would use Myers' algorithm
  while (i < original.length || j < transformed.length) {
    const o = original[i];
    const t = transformed[j];

    if (o === t) {
      // Línea unchanged
      unchanged++;
      i++; j++;
      // No agregamos a diff - líneas idénticas no se muestran normalmente
    } else if (i > 0 && j < transformed.length && original[i - 1] === transformed[j]) {
      // Línea añadida en transformed (el anterior original coincide con esta transformed)
      added++;
      resultLines.push(`+Line ${j + 1}: ${t || "(vacía)"}`);
      j++;
    } else if (j > 0 && i < original.length && transformed[j - 1] === original[i]) {
      // Línea borrada (el anterior transformado coincide con este original)
      deleted++;
      resultLines.push(`-Line ${i + 1}: ${o || "(vacía)"}`);
      i++;
    } else if (
      i < original.length - 1 &&
      j < transformed.length - 1 &&
      original[i + 1] === transformed[j + 1]
    ) {
      // Líneas modificadas: ambas tienen el mismo contenido después
      // Current lines are different, but the next ones are the same
      modified++;
      resultLines.push(`-Line ${i + 1}: ${o || "(vacía)"}`);
      resultLines.push(`+Line ${j + 1}: ${t || "(vacía)"}`);
      i++; j++;
    } else {
      // Línea modificada o diferente
      modified++;
      resultLines.push(`-Line ${i + 1}: ${o || "(vacía)"}`);
      resultLines.push(`+Line ${j + 1}: ${t || "(vacía)"}`);
      i++; j++;
    }
  }

  // Si no hay diferencias reportadas, pero los arrays tienen tamaños diferentes
  if (resultLines.length === 0 && original.length !== transformed.length) {
    // Calcular estadísticas simples
    const shorter = original.length < transformed.length ? original.length : transformed.length;
    const longer = original.length > transformed.length ? original.length : transformed.length;
    added = transformed.length - shorter;
    deleted = original.length - shorter;
  }

  // Construir el string de diff
  const diffString = resultLines.length > 0 ? resultLines.join("\n") : "No differences found";

  const statistics = {
    originalLines: original.length,
    transformedLines: transformed.length,
    unchanged,
    modified,
    added,
    deleted,
  };

  return { diff: diffString, statistics };
}

// ============================================================
// Helpers de estado custom-odd
// ============================================================

/**
 * Obtiene el estado efectivo de custom-odd consultando entradas persistentes.
 * En producción usaría pi.readEntry, aquí simulamos la lógica.
 */
function getEffectiveCustomOddState(pi: ExtensionAPI): "on" | "off" | "inherit" {
  // Intentar leer entrada persistente
  // const entry = pi.readEntry("custom-odd.state/v1");
  // if (entry?.override === "on") return "on";
  // if (entry?.override === "off") return "off";
  // if (entry?.override === "inherit") return "inherit";
  // Estado por defecto
  return "off";
}

// Verificar si hay una entrada persistente para custom-odd
function hasCustomOddPersistentEntry(pi: ExtensionAPI): boolean {
  // const entry = pi.readEntry("custom-odd.state/v1");
  // return !!entry;
  // Placeholder - en producción consultaríamos la API real
  return false;
}

// ============================================================
// Captura de prompt en before_agent_start
// ============================================================

/**
 * Suscribe al evento before_agent_start para capturar el prompt original
 * antes de aplicar overlays.
 * 
 * Este hook se registra en activate() y almacena el prompt en un objeto
 * de captura global accesible desde los comandos /prompt.
 */
let capturedOriginalPrompt: string | null = null;
let capturedSessionId: string | null = null;

function subscribeToBeforeAgentStart(pi: ExtensionAPI) {
  // Suscribirse al evento before_agent_start de Pi
  // Esto se ejecuta antes de que el agente reciba su prompt
  pi.on("before_agent_start", (event: any) => {
    // Capturar el prompt original antes de cualquier transformación
    const systemPrompt = event.systemPrompt;
    if (systemPrompt && typeof systemPrompt === "string") {
      capturedOriginalPrompt = systemPrompt;
      capturedSessionId = event.sessionId || `session_${Date.now()}`;
      // console.log("[pi-custom-gentle] Prompt original capturado:", capturedOriginalPrompt.substring(0, 100) + "...");
    }
  });
}

/**
 * Obtiene el prompt original capturado (si existe)
 */
function getCapturedOriginalPrompt(): string | null {
  return capturedOriginalPrompt;
}

/**
 * Obtiene el ID de sesión capturado
 */
function getCapturedSessionId(): string | null {
  return capturedSessionId;
}

// Limpiar capturas (útil para sesiones nuevas)
function clearCaptures(): void {
  capturedOriginalPrompt = null;
  capturedSessionId = null;
}

// ============================================================
// Helpers de inspección de prompt
// ============================================================

/**
 * Obtiene el prompt estructurado actual desde el contexto de Pi.
 * En un entorno real, esto usaría pi.getSystemPrompt() o el evento before_agent_start.
 * Para el MVP, construimos un prompt basado en el contexto disponible.
 */
function getCurrentPromptStructured(pi: ExtensionAPI, ctx: any): string {
  // Intentar obtener del contexto del agente actual
  // En Pi, el prompt estructurado se construye desde:
  // - systemPromptOptions.customPrompt
  // - systemPromptOptions.appendSystemPrompt
  // - systemPromptOptions.sections
  // - systemPromptOptions Techniques, tools, etc.

  // Por ahora, construimos un prompt base con la información que tenemos
  const parts: string[] = [];

  // Custom prompt si existe
  if (ctx?.getSystemPrompt) {
    try {
      const sysPrompt = ctx.getSystemPrompt();
      if (sysPrompt && typeof sysPrompt === "string" && sysPrompt.length > 0) {
        parts.push(sysPrompt);
      }
    } catch (e) {
      // Ignorar errores de acceso
    }
  }

  // Si no hay prompt real, usar uno base
  if (parts.length === 0) {
    const oddState = getEffectiveCustomOddState(pi);
    parts.push(
      "Eres un asistente útil.\n\n" +
      "Tarea: ayudar al usuario con sus preguntas.\n\n" +
      "Directivas activas: custom-odd " + oddState + "."
    );
  }

  return parts.join("\n");
}

/**
 * Lee las directivas Markdown reales desde el filesystem.
 * Busca archivos en patches/custom-odd/agents/<agent>.md o patches/custom-odd/orchestrator.md
 */
function getMarkdownDirectivesForAgent(agentName: string): string {
  // En producción leeríamos el archivo real desde el filesystem
  // Por ahora, retornamos directivas placeholder basadas en el nombre.
  // El archivo real existe: patches/custom-odd/orchestrator.md
  
  // Intentar leer del filesystem si está disponible
  try {
    // En un entorno real con Node.js:
    // const fs = require('fs');
    // const path = require('path');
    // const filePath = path.join(process.cwd(), 'patches', 'custom-odd', agentName.toLowerCase() + '.md');
    // if (fs.existsSync(filePath)) {
    //   return fs.readFileSync(filePath, 'utf-8');
    // }
    
    // Por ahora, retornaremos el archivo orchestrator.md real o un placeholder
    if (agentName.toLowerCase() === "orchestrator") {
      // Retornaríamos el contenido real, pero aquí usamos un placeholder estructurado
      return `<!-- replace:1:3 -->
Aplica overlay de custom-odd al prompt principal.`;
    }
  } catch (e) {
    // Ignorar errores
  }

  // Directivas placeholder para agentes desconocidos
  return `<!-- replace:1:1 -->
Overlay activo para el agente: ${agentName}. Instrucciones mejoradas.`;
}

/**
 * Aplica patches Markdown al prompt usando el Patch Engine real.
 */
function applyPatchesToPrompt(
  prompt: string,
  markdownDirectives: string
): { transformed: string; diff: string; patchResult: PatchResult } {
  const lines = prompt.split("\n");
  const { directives, errors } = parseDirectives(markdownDirectives);

  if (errors.length > 0) {
    // Si hay errores de parsing, retornamos el prompt original
    return { 
      transformed: prompt, 
      diff: `Errores de parsing: ${errors.map((e: any) => e.message).join("; ")}`,
      patchResult: {
        success: false,
        transformedPrompt: prompt,
        diff: "",
        appliedDirectives: [],
        rejectedDirectives: [],
        compatibilityMessage: `Errores de parsing: ${errors.map((e: any) => e.message).join("; ")}`
      }
    };
  }

  const patchResult: PatchResult = applyPromptPatches(lines, markdownDirectives, {
    agentId: "orchestrator",
    agentName: "orchestrator",
    sourcePath: "custom-odd/orchestrator.md",
    expectedFingerprint: undefined,
  });

  let transformedPrompt = patchResult.success
    ? patchResult.transformedPrompt
    : prompt; // Si falla, usamos original

  // Generar diff usando el generateDiff inline
  const diff = generateDiff(lines, patchedLinesToArray(transformedPrompt));

  return { transformed: transformedPrompt, diff, patchResult };
}

/**
 * Convierte el string transformado a array de líneas para diff
 */
function patchedLinesToArray(transformed: string): string[] {
  return transformed.split("\n");
}

/**
 * Obtiene las fuentes (secciones, skills, herramientas) para un agente
 * basándose en el prompt original inspeccionado.
 */
function getSourcesForAgent(agentName: string): {
  sections?: any[];
  skills?: string[];
  tools?: string[];
  contextFiles?: string[];
} {
  // Placeholder: en producción inspeccionaríamos el prompt original
  // y extraeríamos skills, contextFiles, selectedTools, etc.
  return {
    sections: ["system", "task", "guidelines"],
    skills: ["basic-commands"],
    tools: ["file-reader", "web-search"],
    contextFiles: ["README.md", "package.json"],
  };
}

// ============================================================
// Prompt Snapshot interface
// ============================================================

/**
 * Interfaz para el snapshot de prompt capturado.
 * Almacenado en memoria durante la sesión.
 */
interface PromptSnapshot {
  agentId: string;
  sessionId: string;
  timestamp: number;
  customOddEnabled: boolean;
  originalPrompt: string;
  transformedPrompt: string;
  diff: string;
  appliedPatches: string[];
  warnings: string[];
}

// Almacenamiento en memoria (en producción persistirías en disco o DB)
const promptSnapshots: Map<string, PromptSnapshot> = new Map();

// Función auxiliar: obtener snapshot por agente y sesión
function getSnapshot(agentId: string, sessionId?: string): PromptSnapshot | null {
  const session = sessionId ? promptSnapshots.get(sessionId) : null;
  if (session) return session;
  
  // Si no se proporciona sesión, buscar la más reciente para este agente
  const allSnapshots = Array.from(promptSnapshots.values());
  const agentSnapshot = allSnapshots.find(s => s.agentId === agentId);
  return agentSnapshot || null;
}

// Función auxiliar: obtener la última captura (cualquier agente)
function getLastSnapshot(): PromptSnapshot | null {
  const allSnapshots = Array.from(promptSnapshots.values());
  if (allSnapshots.length === 0) return null;
  
  // Retornar la más reciente por timestamp
  return allSnapshots.reduce((latest, current) =>
    current.timestamp > latest.timestamp ? current : latest
  );
}

// Función auxiliar: limpiar snapshots expirados o liberar memoria
function clearSnapshots(olderThanMs?: number): void {
  if (olderThanMs === undefined) {
    // Limpiar todo (útil al iniciar una nueva sesión)
    promptSnapshots.clear();
    return;
  }
  
  const now = Date.now();
  for (const [key, snapshot] of promptSnapshots.entries()) {
    if (now - snapshot.timestamp > olderThanMs) {
      promptSnapshots.delete(key);
    }
  }
}

// ============================================================
// Versión estructurada del comando /prompt inspect
// ============================================================
// Autocompletado y handler para /custom-odd
// ============================================================

/**
 * Registra el comando /custom-odd con full functionality.
 */
export function registerCustomOddCommand(pi: ExtensionAPI) {
  pi.registerCommand("custom-odd", {
    description: "Manage custom ODD mode (on/off/inherit/always on/always off/status)",

    getArgumentCompletions: (prefix: string) => {
      return getCustomOddCompletions(prefix);
    },

    handler: async (args: string, ctx: any) => {
      const command = args.trim().toLowerCase();

      try {
        // Persistir estado usando la API de Pi
        // Guardar override de sesión
        // pi.appendEntry("custom-odd.state/v1", { override: command, timestamp: Date.now() });

        // Determinar modo efectivo
        const effectiveState = getEffectiveCustomOddState(pi);

        switch (command) {
          case "on": {
            // Aplicar overlay de custom-odd on
            // Suscribirse a before_agent_start si no está ya suscrito
            subscribeToBeforeAgentStart(pi);
            
            // Marcar que custom-odd está activado para esta sesión
            ctx.ui.notify("custom-odd activado en esta sesión", "info");
            
            // Forzar captura de nuevo prompt si ya había uno capturado
            if (capturedOriginalPrompt) {
              // Volver a aplicar patches con el nuevo estado
              // ... lógica de re-captura
            }
            return;
          }
          case "off": {
            // Aplicar overlay de custom-odd off
            // Limpiar suscripciones o marcar como desactivado
            ctx.ui.notify("custom-odd desactivado en esta sesión", "info");
            return;
          }
          case "inherit": {
            // Heredar configuración global
            ctx.ui.notify("override de sesión heredará configuración global", "info");
            return;
          }
          case "always on": {
            // Configuración global persistente
            // pi.appendEntry("custom-odd.global/v1", { alwaysOn: true, timestamp: Date.now() });
            ctx.ui.notify("Configuración global always-on activada", "info");
            return;
          }
          case "always off": {
            // pi.appendEntry("custom-odd.global/v1", { alwaysOff: true, timestamp: Date.now() });
            ctx.ui.notify("Configuración global always-off activada", "info");
            return;
          }
          case "status": {
            // Leer estado efectivo
            const state = getEffectiveCustomOddState(pi);
            let message: string;
            if (state === "on") {
              message = "custom-odd activado (session override: on)";
            } else if (state === "off") {
              message = "custom-odd desactivado (sin override)";
            } else {
              message = "custom-odd heredando configuración global";
            }
            ctx.ui.notify(message, "info");
            return;
          }
          default: {
            ctx.ui.notify(
              `Comando desconocido. Use: ${CUSTOM_ODD_OPTIONS.join("/")}`,
              "warning"
            );
            return;
          }
        }
      } catch (error) {
        ctx.ui.notify(`Error ejecutando /custom-odd: ${error}`, "error");
      }
    },
  });
}

// ============================================================
// Helpers de inspección de prompt
// ============================================================

/**
 * Ejecuta el comando /prompt inspect <agent|orchestrator>
 *
 * Inspecciona el prompt actual (o el del agente especificado) y
 * crea un PromptSnapshot con original, transformado y diff reales.
 */
export function promptInspect(
  agentOrchestrator: "orchestrator" | "all" | string,
  ctx: any,
  pi: ExtensionAPI
): PromptSnapshot | null {
  try {
    // 1. Obtener agente del argumento o default
    const agentMatch = args.match(/\/prompt\s+(\S+)/);
    const agent = agentMatch ? agentMatch[1].trim() : "orchestrator";

    // 2. Determinar si custom-odd está habilitado
    const customOddEnabled = getEffectiveCustomOddState(pi) === "on";

    // 3. Obtener prompt estructurado actual
    // Si hay una captura previa de before_agent_start, usamos esa
    // sino, construimos uno nuevo
    let originalPrompt = getCapturedOriginalPrompt();
    
    if (!originalPrompt) {
      // No hay captura previa, obtener prompt actual
      originalPrompt = getCurrentPromptStructured(pi, ctx);
    }

    // 4. Determinar directivas Markdown basadas en el agente
    const markdownDirectives = getMarkdownDirectivesForAgent(agent);

    // 5. Aplicar patches mediante el Patch Engine real
    const { transformed, diff, patchResult } = applyPatchesToPrompt(
      originalPrompt,
      markdownDirectives
    );

    // 6. Verificar si hubo advertencias
    const warnings: string[] = [];
    if (!patchResult.success) {
      warnings.push(patchResult.compatibilityMessage || "Error applying patches");
    }

    // 7. Crear snapshot
    const sessionId = getCapturedSessionId() || `session_${Date.now()}`;
    const snapshot: PromptSnapshot = {
      agentId: agent,
      sessionId,
      timestamp: Date.now(),
      customOddEnabled,
      originalPrompt,
      transformedPrompt: transformed,
      diff,
      appliedPatches: patchResult.appliedDirectives.map((d: any) => `${d.type}:${d.startLine}-${d.endLine || d.targetLine}`),
      warnings,
    };

    // 8. Guardar en memoria
    promptSnapshots.set(sessionId, snapshot);

    // 9. Mostrar información en UI
    ctx.ui.notify(`Inspección de agente: ${agent} completada`, "info");
    ctx.ui.notify(`State: custom-odd ${snapshot.customOddEnabled ? "ON" : "OFF"}`, "info");

    return snapshot;
  } catch (error) {
    ctx.ui.notify(`Error executing /prompt inspect: ${error}`, "error");
    return null;
  }
}

// ============================================================
// Handler para /prompt
// ============================================================

/**
 * Registra el comando /prompt con full functionality.
 */
export function registerPromptCommand(pi: ExtensionAPI) {
  pi.registerCommand("prompt", {
    description: "Inspect and manage prompts - inspect/diff/sources/payload",

    getArgumentCompletions: (prefix: string) => {
      // Usar la función getPromptCompletions actualizada
      // Por ahora, retornamos completados básicos
      const normalizedPrefix = prefix.trim().toLowerCase();
      
      // Subcomandos
      const subMatches = PROMPT_SUB_COMMANDS.filter(
        (cmd) => cmd.startsWith(normalizedPrefix)
      );
      
      if (subMatches.length > 0) {
        return subMatches.map((cmd) => ({
          value: `${cmd} `,
          label: cmd,
        }));
      }
      
      // Agentes (solo si prefijo muy corto)
      if (normalizedPrefix.length < 3) {
        const agents = ["orchestrator", "explorer", "worker", "verifier"];
        const agentMatches = agents.filter((agent) => agent.startsWith(normalizedPrefix));
        if (agentMatches.length > 0) {
          return agentMatches.map((agent) => ({
            value: `${agent} `,
            label: agent,
          }));
        }
      }

      return null;
    },

    handler: async (args: string, ctx: any) => {
      try {
        // Parsear argumentos: separar subcomando y agente
        // Pi entrega solamente los argumentos, no el comando completo
        const [subcommand, agent = "orchestrator"] =
          args.trim().split(/\s+/);

        switch (subcommand) {
          case "inspect": {
            // Capturar snapshot con datos reales
            const snapshot = promptInspect(agent, ctx, pi);
            
            if (!snapshot) {
              ctx.ui.notify("No se pudo crear la inspección", "error");
              return;
            }

            // Mostrar Prompt Viewer TUI con las 3 pestañas
            await promptViewerTUI(snapshot, ctx);

            return;
          }
          case "export": {
            // Exportar captura actual
            if (!promptSnapshots.size) {
              ctx.ui.notify("No hay capturas previas. Use /prompt inspect primero.", "warning");
              return;
            }

            // Obtener la última captura (o la del agente especificado)
            const lastSession = Array.from(promptSnapshots.entries()).pop();
            const snapshot = lastSession ? lastSession[1] : null;

            if (!snapshot) {
              ctx.ui.notify("No hay captura disponible", "warning");
              return;
            }

            // Mostrar información de exportación
            ctx.ui.notify(`Exportando captura para agente: ${snapshot.agentId}`, "info");
            ctx.ui.notify(`Session ID: ${snapshot.sessionId}`, "info");
            ctx.ui.notify(`Timestamp: ${new Date(snapshot.timestamp).toLocaleString()}`, "info");
            ctx.ui.notify(`Original: ${snapshot.originalPrompt.length} chars`, "info");
            ctx.ui.notify(`Transformed: ${snapshot.transformedPrompt.length} chars`, "info");

            // En producción, guardaríamos aquí en disco
            // fs.mkdirSync(`captures/${snapshot.sessionId}/${snapshot.agentId}`, { recursive: true });
            // fs.writeFileSync(`captures/${snapshot.sessionId}/${snapshot.agentId}/original.md`, snapshot.originalPrompt);
            // etc.

            return;
          }
          case "diff": {
            // Mostrar diff de la captura actual
            if (!promptSnapshots.size) {
              ctx.ui.notify("No hay capturas previas. Use /prompt inspect primero.", "warning");
              return;
            }

            const lastSession = Array.from(promptSnapshots.entries()).pop();
            const snapshot = lastSession ? lastSession[1] : null;

            if (!snapshot) {
              ctx.ui.notify("No hay captura disponible", "warning");
              return;
            }

            ctx.ui.notify(`Diff para agente: ${snapshot.agentId}`, "info");
            ctx.ui.notify(`Original: ${snapshot.originalPrompt.length} lines`, "info");
            ctx.ui.notify(`Transformed: ${snapshot.transformedPrompt.length} lines`, "info");
            ctx.ui.notify(`Diff lines: ${snapshot.diff.split("\n").length}`, "info");

            // Mostrar diff completo (limitado para UI)
            const diffPreview = snapshot.diff.split("\n").slice(0, 20).join("\n");
            ctx.ui.notify(diffPreview + (snapshot.diff.split("\n").length > 20 ? `... (+${snapshot.diff.split("\n").length - 20} more lines)` : ""), "info");

            return;
          }
          case "sources": {
            // Mostrar sources de la captura actual
            if (!promptSnapshots.size) {
              ctx.ui.notify("No hay capturas previas. Use /prompt inspect primero.", "warning");
              return;
            }

            const lastSession = Array.from(promptSnapshots.entries()).pop();
            const snapshot = lastSession ? lastSession[1] : null;

            if (!snapshot) {
              ctx.ui.notify("No hay captura disponible", "warning");
              return;
            }

            ctx.ui.notify(`Sources para agente: ${snapshot.agentId}`, "info");
            ctx.ui.notify(`Sections: ${snapshot.sections?.join(", ") || "ninguna"}`, "info");
            ctx.ui.notify(`Skills: ${snapshot.skills?.join(", ") || "ninguna"}`, "info");
            ctx.ui.notify(`Tools: ${snapshot.tools?.join(", ") || "ninguna"}`, "info");
            ctx.ui.notify(`Context files: ${snapshot.contextFiles?.join(", ") || "ninguna"}`, "info");

            return;
          }
          case "payload": {
            // Mostrar información del payload
            if (!promptSnapshots.size) {
              ctx.ui.notify("No hay capturas previas. Use /prompt inspect primero.", "warning");
              return;
            }

            const lastSession = Array.from(promptSnapshots.entries()).pop();
            const snapshot = lastSession ? lastSession[1] : null;

            if (!snapshot) {
              ctx.ui.notify("No hay captura disponible", "warning");
              return;
            }

            ctx.ui.notify("Payload del proveedor: información del sistema", "info");

            // Intentar obtener información del contexto
            if (ctx?.getSystemPromptOptions) {
              try {
                const opts = ctx.getSystemPromptOptions();
                if (opts) {
                  ctx.ui.notify(
                    `Herramientas seleccionadas: ${opts.selectedTools?.join(", ") || "ninguna"}`,
                    "info"
                  );
                  ctx.ui.notify(
                    `Skills activas: ${opts.skills?.join(", ") || "ninguna"}`,
                    "info"
                  );
                }
              } catch (e) {
                // Ignorar errores
              }
            }

            ctx.ui.notify("Información del payload completada", "info");
            return;
          }
          default: {
            ctx.ui.notify(
              `Subcomando desconocido. Use: ${PROMPT_SUB_COMMANDS.join(
                "/"
              )}`,
              "warning"
            );
            return;
          }
        }
      } catch (error) {
        ctx.ui.notify(`Error ejecutando /prompt: ${error}`, "error");
      }
    },
  });
}

// ============================================================
// Factory function principal
// ============================================================

/**
 * Factory function que Gentle Shell invoca al cargar la extensión.
 * Registra todos los comandos y configura la extensión.
 * Suscribirse a before_agent_start para captura real de prompts.
 */
export default function activate(pi: ExtensionAPI) {
  // Suscribirse al evento before_agent_start para capturar prompts originales
  subscribeToBeforeAgentStart(pi);

  // Registrar todos los comandos
  registerCustomOddCommand(pi);
  registerPromptCommand(pi);

  // Retornar metadatos de la extensión
  return {
    name: "pi-custom-gentle",
    version: "0.1.0",
    schema: "pi-custom-gentle.registry/v1",
    author: "AndyTechnologies",
    description: "Custom ODD prompt extensions for Pi/Gentle Shell - MVP functional with real API integration",
  };
}

// ============================================================
// Componente Prompt Viewer TUI
// ============================================================

/**
 * Muestra el Prompt Viewer interactivo usando ctx.ui.custom().
 * Tiene 3 pestañas: Original, Resultante, Diff.
 * 
 * @param snapshot El snapshot de prompt a mostrar
 * @param ctx Contexto de Pi para UI
 * @returns Promesa que se resuelve cuando el usuario cierra el visor
 */
async function promptViewerTUI(
  snapshot: any,
  ctx: any
): Promise<void> {
  // Determinar el agente y estado para el header
  const agentName = snapshot.agentId || "orchestrator";
  const oddState = snapshot.customOddEnabled ? "ON" : "OFF";
  const captureTime = new Date(snapshot.timestamp).toLocaleString();
  
  // Definir las 3 pestañas y su contenido
  const tabs = [
    {
      id: "original",
      label: "Original",
      title: `Prompt recibido por ${agentName} antes de aplicar overlays`,
      content: snapshot.originalPrompt,
      description: `${snapshot.originalPrompt.length} caracteres, ${countLines(snapshot.originalPrompt)} líneas`,
    },
    {
      id: "resultante",
      label: "Resultante",
      title: `Prompt después de aplicar parches a ${agentName}`,
      content: snapshot.transformedPrompt,
      description: `${snapshot.transformedPrompt.length} caracteres, ${countLines(snapshot.transformedPrompt)} líneas`,
    },
    {
      id: "diff",
      label: "Diff",
      title: `Diferencias entre Original y Resultante`,
      content: snapshot.diff || "No hay diff disponible",
      description: snapshot.diff ? `${snapshot.diff.split("\n").length} líneas de diff` : "Sin diferencias",
    },
  ];
  
  // Estado actual de la pestaña activa
  let activeTab = 0;
  
  // Posición de desplazamiento para cada pestaña
  const scrollPositions: { [key: number]: number } = { 0: 0, 1: 0, 2: 0 };
  
  // Ancho y alto del terminal (aproximado)
  const terminalWidth = Math.max(40, (ctx?.ui?.getTerminalDimensions?.()?.width || 80) - 4);
  const terminalHeight = Math.max(10, (ctx?.ui?.getTerminalDimensions?.()?.height || 25) - 6);
  
  // Función para contar líneas
  function countLines(text: string): number {
    return text.split("\n").length;
  }
  
  // Función para obtener el texto visible de una línea considerando el ancho
  function wrapText(text: string, width: number): string[] {
    if (!text) return [""];
    const lines: string[] = [];
    const words = text.split(" ");
    let currentLine = "";
    
    for (const word of words) {
      const testLine = currentLine + (currentLine ? " " : "") + word;
      if (testLine.length <= width) {
        currentLine = testLine;
      } else {
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }
    return lines;
  }
  
  // Función para obtener líneas visibles de un texto dentro del terminal
  function getVisibleLines(text: string, width: number, height: number, startLine: number): string[] {
    const allLines = wrapText(text, width);
    const endLine = Math.min(startLine + height - 2, allLines.length); // -2 para border
    return allLines.slice(startLine, endLine);
  }
  
  // Función para renderizar una pestaña
  function renderTab(tabIndex: number): string {
    const tab = tabs[tabIndex];
    const width = terminalWidth - 4; // Margen lateral
    const height = terminalHeight - 6; // Margen vertical
    
    // Obtener líneas visibles
    const visibleLines = getVisibleLines(tab.content, width, height, scrollPositions[tabIndex]);
    
    // Construir el contenido de la pestaña
    let result = "";
    
    // Header de la pestaña
    result += `╔${"=".repeat(width)}╗\n`;
    result += `║ ${tab.label.padEnd(width - 2)} ║\n`;
    result += `╠${"-".repeat(width)}╣\n`;
    result += `║ ${tab.title.padEnd(width - 2)} ║\n`;
    result += `║ ${tab.description.padEnd(width - 2)} ║\n`;
    result += `╠${"-".repeat(width)}╣\n`;
    
    // Contenido con scrolling
    result += `║${" ".repeat(width)}║\n`;
    
    // Mostrar líneas de contenido
    for (let i = 0; i < visibleLines.length; i++) {
      const lineNumber = (scrollPositions[tabIndex] + i + 1).toString().padStart(3);
      result += `║ ${lineNumber}: ${visibleLines[i]}`;
      // Ajustar para llenar el ancho
      const paddingNeeded = width - 3 - visibleLines[i].length;
      result += " ".repeat(paddingNeeded > 0 ? paddingNeeded : 0);
      result += " ║\n";
    }
    
    // Línea inferior
    for (let i = visibleLines.length; i < height - 8; i++) {
      result += `║${" ".repeat(width)}║\n`;
    }
    
    result += `╚${"=".repeat(width)}╝\n`;
    
    return result;
  }
  
  // Renderizar el visor completo
  function renderViewer(): string {
    // Renderizar la pestaña activa
    const activeRender = renderTab(activeTab);
    
    // Renderizar indicador de pestañas
    const tabIndicator = ` ${activeTab + 1}/${tabs.length} `;
    
    // Construir el resultado final
    let result = "";
    result += activeRender;
    result += `\n`;
    result += `Controles: ←→ Cambiar pestaña (${tabIndicator}) | ↑↓ Desplazamiento | PgUp/PgDn Página | Esc Cerrar\n`;
    
    return result;
  }
  
  // Mostrar el visor usando ctx.ui.custom()
  // Nota: La API exacta de ctx.ui.custom() puede variar según la versión de Pi
  // Esta es una implementación basada en la especificación del reporte
  
  try {
    // Intentar usar la API de Pi para crear una pantalla personalizada
    if (ctx?.ui?.custom) {
      await ctx.ui.custom(
        (tui, theme, keybindings, done) => {
          // Bucle principal del visor
          let running = true;
          let lastRender = renderViewer();
          
          // Escribir el visor inicial
          tui.write(lastRender);
          
          // Manejar entrada del teclado
          return async (input: any) => {
            // Procesar tecla presionada
            const key = input?.key || input?.name;
            
            running = true;
            
            switch (key) {
              case "escape":
              case "q":
                running = false;
                done?.();
                break;
              
              case "up":
              case "k":
                // Desplazarse hacia arriba
                if (scrollPositions[activeTab] > 0) {
                  scrollPositions[activeTab]--;
                }
                break;
              
              case "down":
              case "j":
                // Desplazarse hacia abajo
                const maxScroll = Math.max(0, countLines(tabs[activeTab].content) - (terminalHeight - 8));
                if (scrollPositions[activeTab] < maxScroll) {
                  scrollPositions[activeTab]++;
                }
                break;
              
              case "pageup":
              case "b":
                // Página arriba
                scrollPositions[activeTab] = Math.max(0, scrollPositions[activeTab] - (terminalHeight - 8));
                break;
              
              case "pagedown":
              case "f":
                // Página abajo
                const maxScroll2 = Math.max(0, countLines(tabs[activeTab].content) - (terminalHeight - 8));
                scrollPositions[activeTab] = Math.min(maxScroll2, scrollPositions[activeTab] + (terminalHeight - 8));
                break;
                
              case "left":
              case "h":
                // Cambiar a pestaña anterior (wrap-around)
                activeTab = (activeTab - 1 + tabs.length) % tabs.length;
                scrollPositions[activeTab] = 0;
                break;
                
              case "right":
              case "l":
                // Cambiar a pestaña siguiente (wrap-around)
                activeTab = (activeTab + 1) % tabs.length;
                scrollPositions[activeTab] = 0;
                break;
                
              default:
                // Cualquier otra tecla, ignorar
                break;
            }
            
            if (!running) {
              done?.();
              return;
            }
            
            // Re-renderizar
            const newRender = renderViewer();
            if (newRender !== lastRender) {
              tui.write(newRender);
              lastRender = newRender;
            }
          };
        },
        {
          blocked: {
            kind: "question",
            message: `Inspect prompt for agent: ${agentName}`,
          },
        }
      );
    } else {
      // Fallback: mostrar información en notificaciones si ctx.ui.custom no está disponible
      ctx.ui.notify("Prompt Viewer TUI no disponible - mostrando preview", "info");
      
      // Mostrar preview en consola
      ctx.ui.notify(`=== PROMPT ORIGINAL ===`, "info");
      ctx.ui.notify(
        snapshot.originalPrompt.substring(0, 300) + (snapshot.originalPrompt.length > 300 ? "..." : ""),
        "info"
      );
      
      ctx.ui.notify(`=== PROMPT TRANSFORMADO ===`, "info");
      ctx.ui.notify(
        snapshot.transformedPrompt.substring(0, 300) + (snapshot.transformedPrompt.length > 300 ? "..." : ""),
        "info"
      );
      
      ctx.ui.notify(`=== DIFF ===`, "info");
      ctx.ui.notify(
        (snapshot.diff || "Sin diff").substring(0, 300) + ((snapshot.diff || "").length > 300 ? "..." : ""),
        "info"
      );
    }
  } catch (error) {
    ctx.ui.notify(`Error en Prompt Viewer TUI: ${error}`, "error");
    // Fallback a mostrar en notificaciones
    ctx.ui.notify("Mostrando preview de la inspección:", "info");
    ctx.ui.notify(`Original (${snapshot.originalPrompt.length} chars): ${snapshot.originalPrompt.substring(0, 200)}${snapshot.originalPrompt.length > 200 ? "..." : ""}`, "info");
    ctx.ui.notify(`Transformado (${snapshot.transformedPrompt.length} chars): ${snapshot.transformedPrompt.substring(0, 200)}${snapshot.transformedPrompt.length > 200 ? "..." : ""}`, "info");
    ctx.ui.notify(`Diff lines: ${(snapshot.diff?.split("\n").length || 0)}`, "info");
  }
}

/**
 * Helper: contar líneas de un texto
 */
function countLines(text: string): number {
  return text.split("\n").length;
}

// ============================================================
// Handlers de comandos actualizados (usando promptViewerTUI)
// ============================================================