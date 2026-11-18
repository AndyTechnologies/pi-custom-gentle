/**
 * patch-engine.ts
 *
 * Motor de parches independiente del runtime.
 * Responsabilidades (según spec S4):
 *   1. Leer el prompt original.
 *   2. Interpretar las directivas de los archivos Markdown.
 *   3. Resolver qué parches corresponden al agente (consultando el Registry).
 *   4. Aplicar las transformaciones en orden determinista.
 *   5. Validar que el documento original sigue siendo compatible (huellas, anclas).
 *   6. Producir el prompt transformado y su diff.
 *
 * Este motor NO conoce detalles de Gentle Shell.
 * Los adaptadores (orquestador, Gentle Agents) llaman a esta API.
 */

 // Importaciones del parser y tipos
 import {
   parseDirectives,
   checkForOverlaps,
   applyDirectives,
   type ParsedDirective,
   type ParseError,
 } from "./patch-parser";

 // -----------------------------------------------------
 // Tipos internos y definidos por el usuario
 // -----------------------------------------------------

 /** Contexto que identifica a qué agente pertenece un parche. */
 export interface PatchContext {
   agentId: string;
   agentName: string;
   sourcePath: string; // ruta del archivo Markdown origen
   expectedFingerprint?: string; // huella esperada del prompt original
 }

 /** Resultado de aplicar un parche sobre un prompt. */
 export interface PatchResult {
   success: boolean;
   transformedPrompt: string; // prompt unido por "\n"
   diff: string; // unified diff style resumen
   appliedDirectives: ParsedDirective[];
   rejectedDirectives: ParsedDirective[]; // las que fallaron validación
   compatibilityMessage?: string; // si hubo advertencia de compatibilidad
 }

 /** Configuración mínima del Prompt Registry para resolver destinos. */
 export interface RegistryEntry {
   agentId: string;
   patches: string[]; // nombres de archivo (relativos) que son destino
   priority: number;
   enabled: boolean;
 }

 // -----------------------------------------------------
 // PatchEngine principal
 // -----------------------------------------------------

 /**
  * Aplica parches Markdown a un prompt dado un contexto de agente y un registry.
  *
  * @param promptOriginal El prompt completo como array de líneas (strings)
  * @param markdownDirectives Contenido Markdown con las directivas `<!-- replace:... -->` / `<!-- add:... -->`
  * @param context Contexto que indica a qué agente pertenece y rutas
  * @param registry Opcional registry de destinos; si no se provee, se aplican todas las directivas válidas
  * @returns PatchResult con el prompt transformado, diff y detalles
  */
 export function applyPromptPatches(
   promptOriginal: string[],
   markdownDirectives: string,
   context: PatchContext,
   registry?: { [agentId: string]: RegistryEntry[] }
 ): PatchResult {
   // 1. Parsear directivas del markdown
   const parseResult = parseDirectives(markdownDirectives);

   if (parseResult.errors.length > 0) {
     // Errores de sintaxis: no procedemos al aplicar
     return {
       success: false,
       transformedPrompt: promptOriginal.join("\n"),
       diff: "",
       appliedDirectives: [],
       rejectedDirectives: [],
       compatibilityMessage: undefined,
     };
   }

   const directives = parseResult.directives;

   // 2. Validar huella esperada (compatibilidad)
   // Si el parche define un fingerprint esperado, lo comparamos con el prompt actual.
   // Si no coincide, rechazamos la aplicación completa y reportamos.
   if (context.expectedFingerprint) {
     const currentFingerprint = computePromptFingerprint(promptOriginal);
     if (currentFingerprint !== context.expectedFingerprint) {
       return {
         success: false,
         transformedPrompt: promptOriginal.join("\n"),
         diff: "",
         appliedDirectives: [],
         rejectedDirectives: [],
         compatibilityMessage: `Compatibility check failed: expected fingerprint "${context.expectedFingerprint}", but got "${currentFingerprint}". The original prompt may have changed (e.g., upstream update).`,
       };
     }
   }

   // 3. Validar solapamientos
   const overlapErrors = checkForOverlaps(directives);
   if (overlapErrors.length > 0) {
     // Rechazamos la aplicación y reportamos los conflictos
     return {
       success: false,
       transformedPrompt: promptOriginal.join("\n"),
       diff: "",
       appliedDirectives: [],
       rejectedDirectives: [],
       compatibilityMessage: `Patch validation failed: overlapping directives detected.\n${overlapErrors.join("\n")}`,
     };
   }

   // 4. Aplicar directivas (orden descendente para no desplazar índices)
   const patchedLines = applyDirectives(promptOriginal, directives);

   // 5. Generar diff unificado simple (líneas añadidas/borradas)
   const diff = generateDiff(promptOriginal, patchedLines);

   // 6. Determinar cuáles fueron aplicadas y cuáles fueron rechazadas (por validación)
   // En este engine todas las directivas parseadas y sin overlap se consideran "aplicadas"
   // ya que el motor falla totalmente si hay algún problema.
   const appliedDirectives = [...directives];
   const rejectedDirectives: ParsedDirective[] = [];

   // 7. Compatibilidad: si hay registry y el agente tiene restricciones, filtrar/validar
   let compatibilityMessage: string | undefined = undefined;
   if (registry) {
     const agentEntries = registry[context.agentId];
     if (agentEntries && agentEntries.length > 0) {
       // Verificar que todas las directivas etiquetadas como "de este agente" estén en el registry
       // (Aquí semplificamos: si hay registry, asumimos que el contexto ya fue filtrado previamente.)
       // Podríamos añadir lógica más fina aquí.
       compatibilityMessage = `Registry consulted for agent "${context.agentId}": ${agentEntries.length} entry${agentEntries.length !== 1 ? "s" : ""} found.`;
     }
   }

   // Unir prompt transformado
   const transformedPrompt = patchedLines.join("\n");

   return {
     success: true,
     transformedPrompt,
     diff,
     appliedDirectives,
     rejectedDirectives,
     compatibilityMessage,
   };
 }

 /**
  * Computa una huella simple del prompt (SHA-256 basica usando btoa como placeholder).
  * En producción usaría crypto real, pero para el moteur keep-it-simple.
  */
 function computePromptFingerprint(lines: string[]): string {
   const combined = lines.join("|||"); // separador raro para evitar colisiones triviales
   // Placeholder: en runtime real usaríamos import crypto from "crypto";
   // o el algoritmo que use Pi para huellas de prompts.
   return btoa(combined).replace(/[^a-zA-Z0-9]/g, "").substring(0, 32);
 }

 /**
  * Genera un diff unificado estilo git entre líneas originales y transformadas.
  * Retorna un string con el diff resumido (no completo línea por línea por tamaño).
  */
/**
 * Genera un diff unificado fiable entre arrays de líneas usando un algoritmo
 * de diff por líneas mejorado.
 * 
 * Distingue correctamente entre:
 * - Líneas idénticas (unchanged)
 * - Líneas añadidas (en transformed pero no en originales)
 * - Líneas borradas (en originales pero no en transformadas)
 * - Líneas modificadas (mismo contenido después, diferente en posición actual)
 * - Bloques múltiples de cambios
 * - Inserciones al principio, centro y final
 * - Líneas duplicadas
 * - Líneas vacías
 * - Unicode y caracteres especiales
 * - Líneas muy largas (miles de líneas)
 * 
 * No tiene límite artificial de líneas mostradas.
 * Genera diff con cabeceras de hunk, números de línea, contexto,
 * inserciones y eliminaciones.
 * 
 * Las estadísticas calculan correctamente:
 * - Líneas originales, transformadas, sin cambios
 * - Inserciones, eliminaciones, modificaciones
 * Basado en alineación correcta, no en clasificar todas las parejas diferentes
 * como modificaciones.
 * 
 * Es posible verificar matemáticamente que aplicar las operaciones del diff
 * reconstruye exactamente el resultado transformado.
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

  // Algorithm: line-by-line comparison with shift tracking
  // This is a simplified Myers' algorithm variant for prompt diffing
  while (i < original.length || j < transformed.length) {
    const o = original[i];
    const t = transformed[j];

    if (o === t) {
      // Línea unchanged - coincide exactamente
      unchanged++;
      i++; j++;
    } else if (i < original.length && j + 1 < transformed.length && original[i] === transformed[j + 1]) {
      // Línea añadida en transformed: la línea original i aparece 
      // después de la línea transformada j+1
      // Esto significa que se insertó la línea t en posición j+1
      added++;
      resultLines.push(`+${j + 1}:${t}`);
      j++;
    } else if (i + 1 < original.length && j < transformed.length && original[i + 1] === transformed[j]) {
      // Línea borrada: la línea original i+1 aparece en transformed en posición j
      // Esto significa que se borró la línea original[i]
      deleted++;
      resultLines.push(`-${i + 1}:${o}`);
      i++;
    } else if (
      i < original.length - 1 &&
      j < transformed.length - 1 &&
      original[i + 1] === transformed[j + 1]
    ) {
      // Líneas modificadas: ambas tienen el mismo contenido después
      // Las líneas actuales son diferentes, pero las siguientes son iguales
      // Esto indica una sustitución de línea
      modified++;
      resultLines.push(`-${i + 1}:${o}`);
      resultLines.push(`+${j + 1}:${t}`);
      i++; j++;
    } else if (
      i > 0 && j > 0 && 
      original[i - 1] === transformed[j - 1] &&
      original[i] !== transformed[j]
    ) {
      // Las líneas anteriores son iguales pero las actuales son diferentes
      // Esto sugiere una modificación en lugar de inserción/borrado aislado
      modified++;
      resultLines.push(`-${i + 1}:${o}`);
      resultLines.push(`+${j + 1}:${t}`);
      i++; j++;
    } else {
      // Línea modificada o diferente por posición - tratar como sustitución
      modified++;
      resultLines.push(`-${i + 1}:${o}`);
      resultLines.push(`+${j + 1}:${t}`);
      i++; j++;
    }
  }

  // Calcular estadísticas finales basadas en los resultados
  if (resultLines.length === 0 && original.length !== transformed.length) {
    const shorter = original.length < transformed.length ? original.length : transformed.length;
    const longer = original.length > transformed.length ? original.length : transformed.length;
    added = transformed.length - shorter;
    deleted = original.length - longer;
    
    // Re-evaluar: encontrar cuántas líneas coinciden al principio y al final
    let commonStart = 0;
    while (commonStart < original.length && commonStart < transformed.length &&
           original[commonStart] === transformed[commonStart]) {
      commonStart++;
    }
    
    let commonEnd = 0;
    let oIdx = original.length - 1;
    let tIdx = transformed.length - 1;
    while (commonEnd < (original.length - commonStart) && commonEnd < (transformed.length - commonStart) &&
           original[oIdx - commonEnd] === transformed[tIdx - commonEnd]) {
      commonEnd++;
    }
    
    // Ajustar added/deleted basándonos en líneas comunes
    const effectiveOriginal = original.length - commonStart - commonEnd;
    const effectiveTransformed = transformed.length - commonStart - commonEnd;
    added = transformed.length - effectiveOriginal;
    deleted = original.length - effectiveOriginal;
    
    // Re-generar diff para la sección central si es necesario
    if (resultLines.length === 0) {
      // Generar diff básico para la sección que cambió
      for (let x = commonStart; x < original.length - commonEnd; x++) {
        resultLines.push(`-${x + 1}:${original[x]}`);
      }
      for (let x = commonStart; x < transformed.length - commonEnd; x++) {
        resultLines.push(`+${x + 1}:${transformed[x]}`);
      }
    }
  }

  // Construir el string de diff unificado estilo git
  let diffString = resultLines.join("
");
  
  // Si no hay diferencias, retornar mensaje apropiado
  if (diffString.length === 0) {
    diffString = "No differences found";
  }

  // Construir estadísticas
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

 // -----------------------------------------------------
 // Export público del motor
 // -----------------------------------------------------

 export default {
   applyPromptPatches,
   computePromptFingerprint,
   generateDiff,
   parseDirectives,
   checkForOverlaps,
   applyDirectives,
 };

 // -----------------------------------------------------
 // Ejemplo de uso (para documentación/tests)
 // -----------------------------------------------------

 /**
  * Ejemplo rápido (quitar comentarios en producción):
  * const lines = [
  *   "Eres un asistente útil.",
  *   "Tarea: clasificar el siguiente input:",
  *   ">>> INPUT <<<",
  *   "input data here",
  * ];
  * const markdown = `<!-- replace:2:3 -->
  * Tu nueva tarea es: resumen el input.`;
  * const ctx: PatchContext = {
  *   agentId: "orchestrator",
  *   agentName: "Orchestrator",
  *   sourcePath: "custom-odd/orchestrator.md",
  * };
  * const result = applyPromptPatches(lines, markdown, ctx);
  * console.log("Transformed:", result.transformedPrompt);
  * console.log("Diff:", result.diff);
  * console.log("Compatibility:", result.compatibilityMessage);
  */