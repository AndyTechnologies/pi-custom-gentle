/**
 * prompt-inspector.ts
 *
 * Componente Prompt Inspector según especificación S9.
 * Proporciona comandos y utilidades para inspeccionar, exportar y diferenciar
 * los prompts en tres niveles:
 *
 * Nivel 1: prompt estructurado (capturado en before_agent_start).
 * Nivel 2: prompt encadenado (before/after patches).
 * Nivel 3: payload del proveedor (capturado en before_provider_request).
 *
 * Comandos soportados:
 *   /prompt inspect <agent|orchestrator>
 *   /prompt export <agent|orchestrator>
 *   /prompt export all
 *   /prompt diff <agent|orchestrator>
 *   /prompt sources <agent|orchestrator>
 *   /prompt payload
 *
 * Cada captura se puede guardar en el directorio captures/<session-id>/<agent>/
 * con archivos: original.md, transformed.md, diff.patch, sources.json, metadata.json
 *
 * Privacidad: por defecto solo se conserva la información necesaria para inspeccionar
 * el prompt, con límites de tamaño. El payload completo es optativo.
 */

 // Importaciones placeholder de la API de Pi
 // En runtime real: import { before_agent_start, before_provider_request } from "@pi-dev/core"
 // Aquí definimos las firmas y lógicas necesarias.

 // Importaciones internas
 import { customOdd, getState } from "../state/state-manager";
 import { applyPromptPatches } from "../core/patch-engine";
 import { type PatchResult } from "../core/patch-engine";
 import { type RegistryEntry } from "../core/patch-registry";
 import { type CustomOddState } from "../state/state-manager";

// -----------------------------------------------------------------
// Tipos internos para almacenamiento de capturas
// -----------------------------------------------------------------

 /** Información de una captura individual. */
 export interface CaptureInfo {
   sessionId: string; // ID de sesión (generado o proporcionado)
   agentName: string; // Nombre del agente u "orchestrator"
   timestamp: number; // Cuándo se capturó
   /** Nivel 1: prompt estructurado antes de cualquier modificación */
   originalPrompt: string;
   /** Nivel 2: prompt después de aplicar los parches del motor */
   transformedPrompt: string;
   /** Nivel 3: payload del proveedor (si está disponible) */
   providerPayload?: string;
   /** Diferencia unificada entre original y transformada */
   diff: string;
   /** Metadatos de fuentes (secciones, skills, herramientas, etc.) */
   sources: {
     sections?: any[];
     skills?: string[];
     tools?: string[];
     contextFiles?: string[];
     [key: string]: any;
   };
   /** Huella del prompt original (para validación de compatibilidad) */
   originalFingerprint: string;
   /** Huella del prompt transformado */
   transformedFingerprint: string;
   /** Flag: ¿el payload incluye datos sensibles? */
   hasSensitiveData: boolean;
 }

 /** Opciones de export/inspector para controlar privacidad y tamaño. */
 export interface InspectorOptions {
   /** Tamaño máximo de bytes para el payload del proveedor (0 = todo, -1 = ninguno) */
   maxProviderPayloadBytes?: number;
   /** Si true, incluye el payload completo aunque tenga datos sensibles */
   includeSensitivePayload?: boolean;
   /** Si true, guarda las capturas en disco (o en memoria simulada) */
   persistCaptures?: boolean;
   /** Directorio base donde almacenar capturas (relative to cwd) */
   baseCaptureDir?: string;
 }

// -----------------------------------------------------------------
// Almacenamiento en memoria (en producción persistirías en disco o DB)
// -----------------------------------------------------------------

// Mapa: sessionId -> Map<agentName, CaptureInfo>
const capturesStore: Map<string, Map<string, CaptureInfo>> = new Map();

// -----------------------------------------------------------------
// Helpers de utilidad
// -----------------------------------------------------------------

/** Genera un ID de sesión si no existe. */
function generateSessionId(): string {
  return `session_${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`;
}

/** Computa una fingerprint (hash simple) de un string. */
function computeFingerprint(text: string): string {
  // Placeholder: en producción usaríamos crypto.createHash('sha256').update(text).digest('hex')
  return btoa(text).replace(/[^a-zA-Z0-9]/g, "").substring(0, 32);
}

/** Obtiene o crea el map de captures para una sesión. */
function getCapturesForSession(sessionId: string): Map<string, CaptureInfo> {
  if (!capturesStore.has(sessionId)) {
    capturesStore.set(sessionId, new Map());
  }
  return capturesStore.get(sessionId)!;
}

// -----------------------------------------------------------------
// API pública: comandos de inspector
// -----------------------------------------------------------------

/**
 * Ejecuta el comando /prompt inspect <agent|orchestrator>
 *
 * Inspecciona el prompt actual (o el del agente especificado) y
 * retorna la información de captura nivel 1 (estructurado) y nivel 2 (encadenado).
 *
 * @param agentOrchestrator "orchestrator" | "all" | nombre de agente específico
 * @param options Opciones deInspector (persistir, límites, etc.)
 * @returns CaptureInfo con los datos obtenidos
 */
 export function promptInspect(
   agentOrchestrator: "orchestrator" | "all" | string,
   options: InspectorOptions = {}
 ): CaptureInfo | CaptureInfo[] {
   const sessionId = options.persistCaptures ? (options.baseCaptureDir || generateSessionId()) : generateSessionId();
   const caps = getCapturesForSession(sessionId);
   const isAll = agentOrchestrator === "all";

   // Determinar qué agente(s) inspeccionar
   const agentsToInspect: string[] = [];
   if (isAll) {
     // En un caso real, listaría los agentes activos registrados
     agentsToInspect.push("orchestrator"); // Placeholder
   } else if (agentOrchestrator === "orchestrator") {
     agentsToInspect.push("orchestrator");
   } else {
     // Agente específico - verificar si está activo
     agentsToInspect.push(agentOrchestrator);
   }

   const results: CaptureInfo[] = [];

   for (const agentName of agentsToInspect) {
     // 1. Obtener estado actual de custom-odd
     const state = getState();

     // 2. Simular/oobtener el prompt estructurado actual.
     //    En producción, esto vendría del evento before_agent_start
     //    o del sistema de Pi.
     let originalPrompt = getPromptForAgent(agentName, state);

     // 3. Aplicar los parches mediante el Patch Engine.
     //    Necesitamos el markdown del agente y el registry.
     //    Por ahora usamos directivas placeholder.
     const markdownDirectives = getMarkdownDirectivesForAgent(agentName);
     const patchResult = applyPromptPatches(
       originalPrompt.split("\n"),
       markdownDirectives,
       {
         agentId: agentName,
         agentName: agentName,
         sourcePath: `custom-odd/${agentName.toLowerCase()}.md`,
         expectedFingerprint: undefined,
       }
     );

     let transformedPrompt = patchResult.success
       ? patchResult.transformedPrompt
       : originalPrompt; // Si falla, usamos original

     // 4. Calcular fingerprints
     const originalFingerprint = computeFingerprint(originalPrompt);
     const transformedFingerprint = computeFingerprint(transformedPrompt);

     // 5. Generar diff
     const diff = generateSimpleDiff(
       originalPrompt.split("\n"),
       transformedPrompt.split("\n")
     );

     // 6. Registrar fuentes (simplificado)
     const sources = getSourcesForAgent(agentName);

     // 7. Captura nivel 3 opcional: payload del proveedor
     //    (En producción se capturaría en before_provider_request)
     let providerPayload: string | undefined;
     let hasSensitiveData = false;

     if (options.includeSensitivePayload) {
       // Capturar payload real - placeholder
       providerPayload = "(payload completo - modo sensible OFF por defecto)";
       hasSensitiveData = true;
     } else {
       // Por defecto, limitamos a indicadores de qué herramientas/skills participaron
       providerPayload = undefined;
       hasSensitiveData = false;
     }

     // 8. Crear objeto CaptureInfo
     const capture: CaptureInfo = {
       sessionId,
       agentName,
       timestamp: Date.now(),
       originalPrompt,
       transformedPrompt,
       providerPayload,
       diff,
       sources,
       originalFingerprint,
       transformedFingerprint,
       hasSensitiveData,
     };

     // 9. Guardar en el store
     caps.set(agentName, capture);

     // 10. Si persistCaptures, escribiríamos a disco aquí
     //    (implementación dependiente del fs de Pi)

     results.push(capture);
   }

   // Retornar un solo resultado si fue para un agente específico,
   // o un array si fue "all"
   return isAll ? results : results[0];
 }

 /** Obtiene el prompt actual para un agente (placeholder - integrar con Pi). */
 function getPromptForAgent(agentName: string, state: CustomOddState): string {
   // En producción obtendríamos el prompt del sistema de Pi,
   // posiblemente a través de before_agent_start hooks.
   // Por ahora, retornamos un prompt base genérico.
   return `
Eres un asistente útil.

Tarea: ayudar al usuario con sus preguntas.

Directivas activas: custom-odd ${state.effective}.

Fuentes: skills básicas, contexto de proyecto.
`.trim();
 }

 /** Obtiene las directivas Markdown para un agente (lee del filesystem o registry). */
 function getMarkdownDirectivesForAgent(agentName: string): string {
   // En producción leeríamos el archivo real: custom-odd/agents/<agent>.md
   // Por ahora, retornamos directivas placeholder basadas en el nombre.
   return `<!-- replace:1:1 -->
Overlay activo para el agente: ${agentName}. Instrucciones mejoradas.`;
 }

 /** Obtiene las fuentes (secciones, skills, herramientas) para un agente. */
 function getSourcesForAgent(agentName: string): CaptureInfo["sources"] {
   // Placeholder: en producción inspeccionaríamos el prompt original
   // y extraeríamos skills, contextFiles, selectedTools, etc.
   return {
     sections: ["system", "task", "guidelines"],
     skills: ["basic-commands"],
     tools: ["file-reader", "web-search"],
     contextFiles: ["README.md", "package.json"],
   };
 }

 /** Genera un diff simple entre arrays de líneas. */
 function generateSimpleDiff(original: string[], transformed: string[]): string {
   const lines: string[] = [];
   let i = 0;
   let j = 0;

   while (i < original.length || j < transformed.length) {
     const o = original[i];
     const t = transformed[j];

     if (o === t) {
       i++; j++;
     } else {
       // Línea diferente: reportar qué cambió
       lines.push(`-Line ${i + 1}: ${o || "(vacía)"}`);
       lines.push(`+Line ${j + 1}: ${t || "(vacía)"}`);
       i++; j++;
     }
   }

   if (lines.length > 30) {
     lines.length = 30;
     lines.push(`... (${original.length} vs ${transformed.length} lines)`);
   }

   return lines.join("\n");
 }

 /**
 * Ejecuta el comando /prompt export <agent|orchestrator>
 *
 * Exporta la captura más reciente para el agente especificado
 * generando los archivos en el directorio structure:
 *   captures/<session-id>/<agent>/original.md
 *   captures/<session-id>/<agent>/transformed.md
 *   captures/<session-id>/<agent>/diff.patch
 *   captures/<session-id>/<agent>/sources.json
 *   captures/<session-id>/<agent>/metadata.json
 *
 * Si no hay captura previa, crea una nueva inspección.
 *
 * @param agentOrchestrator "orchestrator" | "all" | nombre de agente
 * @param options Opciones deInspector
 * @returns La ruta o estructura de exportación generada
 */
 export function promptExport(
   agentOrchestrator: "orchestrator" | "all" | string,
   options: InspectorOptions = {}
 ): string | string[] {
   // Obtener los datos de inspección (creará una nueva si no existe)
   const capture = promptInspect(agentOrchestrator, options);

   if (Array.isArray(capture)) {
     // Si "all", retornamos rutas de cada uno
     return capture.map((c) => exportCaptureToPath(c, options));
   }

   // Individual: retornar ruta única
   return exportCaptureToPath(capture, options);
 }

 /** Escribe los archivos de captura en una estructura de directorios simulada. */
 function exportCaptureToPath(
   capture: CaptureInfo,
   options: InspectorOptions
 ): string {
   // Directorio base: captures/<session-id>/<agent-name>/
   const baseDir =
     options.baseCaptureDir || `captures/${capture.sessionId}/${capture.agentName}`;

   // En una implementación real, haríamos:
   // fs.mkdirSync(baseDir, { recursive: true });
   // fs.writeFileSync(path.join(baseDir, "original.md"), capture.originalPrompt);
   // fs.writeFileSync(path.join(baseDir, "transformed.md"), capture.transformedPrompt);
   // fs.writeFileSync(path.join(baseDir, "diff.patch"), capture.diff);
   // fs.writeFileSync(path.join(baseDir, "sources.json"), JSON.stringify(capture.sources, null, 2));
   // fs.writeFileSync(path.join(baseDir, "metadata.json"), JSON.stringify({...}, null, 2));

   // Por ahora, solo retornamos la ruta simulada.
   const simulatedPath = baseDir; // En realidad sería la ruta física
   console.log(
     `[prompt-inspector] Export capture would be at: ${simulatedPath} (simulated)`
   );
   return simulatedPath;
 }

 /**
 * Ejecuta el comando /prompt diff <agent|orchestrator>
 *
 * Muestra solo el diff de la captura más reciente para el agente.
 * Útil para ver rápidamente qué cambió sin necesidad de exportar archivos.
 *
 * @param agentOrchestrator "orchestrator" | "all" | nombre de agente
 * @param options Opciones deInspector
 * @returns El string diff o mensaje si no hay captura
 */
 export function promptDiff(
   agentOrchestrator: "orchestrator" | "all" | string,
   options: InspectorOptions = {}
 ): string | string[] {
   const sessionId = generateSessionId();
   const caps = getCapturesForSession(sessionId);

   // Inspeccionar para llenar el store (solo para tener datos)
   promptInspect(agentOrchestrator, { ...options, persistCaptures: false });

   // Ahora intentar obtener la captura más reciente para este agente
   const agentName =
     agentOrchestrator === "all"
       ? "orchestrator" // placeholder
       : typeof agentOrchestrator === "string"
      ? agentOrchestrator
      : null;

   if (!agentName) return "Invalid agent name";

   const capture = caps.get(agentName);
   if (!capture) {
     return `No capture found for agent "${agentName}". Run /prompt inspect first.`;
   }

   // Retornar solo el diff
   if (Array.isArray(capture)) {
     return capture.map((c) => c.diff);
   }
   return capture.diff;
 }

 /**
 * Ejecuta el comando /prompt sources <agent|orchestrator>
 *
 * Muestra las fuentes (secciones, skills, herramientas, contextFiles)
 * que contribuyeron al prompt del agente.
 *
 * @param agentOrchestrator "orchestrator" | "all" | nombre de agente
 * @param options Opciones deInspector
 * @returns Objeto sources o array de mismos
 */
 export function promptSources(
   agentOrchestrator: "orchestrator" | "all" | string,
   options: InspectorOptions = {}
 ): any | any[] {
   const sessionId = generateSessionId();
   const caps = getCapturesForSession(sessionId);

   // Inspeccionar para llenar store
   promptInspect(agentOrchestrator, { ...options, persistCaptures: false });

   const agentName =
     agentOrchestrator === "all"
       ? "orchestrator"
       : typeof agentOrchestrator === "string"
      ? agentOrchestrator
      : null;

   if (!agentName) return "Invalid agent name";

   const capture = caps.get(agentName);
   if (!capture) {
     return `No capture found. Run /prompt inspect first.`;
   }

   if (Array.isArray(capture)) {
     return capture.map((c) => c.sources);
   }
   return capture.sources;
 }

// -----------------------------------------------------------------
// Ejemplo de uso / documentación
// -----------------------------------------------------------------

/**
 * Ejemplos de uso de los comandos del Prompt Inspector:
 *
 * 1. Inspeccionar el prompt del orquestador:
 *   /prompt inspect orchestrator
 *   -> Retorna CaptureInfo con original, transformado, diff, sources, fingerprints.
 *
 * 2. Inspeccionar un agente específico (ej. "explorer"):
 *   /prompt inspect explorer
 *   -> Igual que arriba pero para ese agente en particular.
 *
 * 3. Exportar capturas a archivos:
 *   /prompt export orchestrator
 *   -> Crea directorio captures/session-id/orchestrator/ con los archivos.
 *
 * 4. Ver solo el diff:
 *   /prompt diff explorer
 *   -> Muestra el texto diff de la última inspección.
 *
 * 5. Ver fuentes:
 *   /prompt sources orchestrator
 *   -> Mupe qué secciones, skills y herramientas aportaron al prompt.
 *
 * 6. Inspeccionar con payload optativo (preciso pero sensible):
 *   /prompt inspect orchestrator --include-sensitivity
 *   -> Incluye providerPayload en la captura (marcado hasSensitiveData=true).
 *
 * 7. Exportar todo:
 *   /prompt export all
 *   -> Itera sobre todos los agentes conocidos y exporta cada uno.
 */

 export default {
   promptInspect,
   promptExport,
   promptDiff,
   promptSources,
 };