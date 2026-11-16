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
 function generateDiff(original: string[], transformed: string[]): string {
   const lines: string[] = [];

   // Contar diferencias simples: we'll produce a very rough diff
   // Para un diff "real" usaríamos un library como `diff` de npm, pero para evitar
   // dependencias añadimos un enfoque manual sencillo.

   // Marcar líneas que cambiaron, se añadieron o se borraron.
   // Este es un diff "pseudo-unified" solo para fines de reporte.

   let i = 0;
   let j = 0;

   while (i < original.length || j < transformed.length) {
     const origLine = original[i];
     const transLine = transformed[j];

     if (origLine === transLine) {
       // Igual - no parte del diff (o podríamos añadir " ")
       i++; j++;
     } else {
       // Diferente
       // Simplificado: reportar que la línea original i cambió por la transformada j
       lines.splice(0, 0, `-${i + 1}: ${origLine}`); // posición 1-indexed
       lines.splice(1, 0, `+${j + 1}: ${transLine}`);
       i++; j++;
     }
   }

   // Compactar: si hay demasiadas líneas, resumimos
   if (lines.length > 20) {
     lines.length = 20;
     lines.push(`... (${original.length} original → ${transformed.length} transformed lines)`);
   }

   return lines.join("\n");
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