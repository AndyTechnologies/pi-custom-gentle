/**
 * patch-parser.ts
 *
 * Parser de directivas Markdown para el Patch Engine.
 * Soporta dos tipos de operaciones:
 *   1. `<!-- replace:start:end -->` - Reemplaza un rango de líneas (inclusive)
 *   2. `<!-- add:line -->` - Inserta contenido antes de la línea indicada
 *
 * Norma (según spec S4):
 * - Numeración begins en 1
 * - `replace`: rango inclusivo
 * - `add`: inserta antes de la línea indicada
 * - Línea de inserción inexistente → inserta al final
 * - Directivas: nunca aparecen en el prompt final
 * - Operaciones: se calculan respecto al documento original
 * - Orden: se aplican de abajo hacia arriba
 * - Solapamientos: error de validación
 */

 // Tipos de directiva
export type DirectiveType = "replace" | "add";

 // Firma de una directiva parseada
 export interface ParsedDirective {
   type: DirectiveType;
   // Para replace: líneas inicial y final (1-indexed, inclusive)
   startLine: number;
   endLine: number;
   // Para add: línea antes de la cual insertar
   targetLine: number;
   // Contenido a reemplazar o insertar
   content: string;
 }

 /**
  * Línea de reporte de errores de parsing.
  * Se acumulan durante el parseo y se validan juntos.
  */
 export interface ParseError {
   line: number;      // Número de línea en el documento donde apareció la directiva
   message: string;
   code: "unknown_directive" | "invalid_range" | "overlap" | "malformed";
 }

 /**
  * Parsea todas las directivas `<!-- -->` de un bloque de texto Markdown.
  * Ignora directivas que no reconocen o están mal formateadas (se dejan pasar).
  * Retorna las directivas encontradas y cualquier error de validación.
  */
 export function parseDirectives(
   markdown: string
 ): {
   directives: ParsedDirective[];
   errors: ParseError[];
 } {
   const directives: ParsedDirective[] = [];
   const errors: ParseError[] = [];

   // Expresión regular para capturar directivas:
   // <!-- type:param1:param2 -->  o  <!-- type:param1 -->
   // Los grupos opcionales permiten flexibilidad.
   const regex = /<!--\s*(replace|add):(\d+)(?::(\d+))?\s*-->/g;

   let match: RegExpExecArray | null;

   while ((match = regex.exec(markdown)) !== null) {
     const directiveType = match[1] as DirectiveType;
     const startLine = parseInt(match[2], 10); // siempre definida
     const endLine = match[3] ? parseInt(match[3], 10) : null;

     const lineNumber = match.index + 1; // posición aproximada en el texto

     try {
       switch (directiveType) {
         case "replace": {
           // replace requiere startLine y endLine
           if (endLine === null) {
             errors.push({
               line: lineNumber,
               message: "directive `replace` requiere: start y end line",
               code: "invalid_range",
             });
             continue;
           }

           // Validar que start <= end
           if (startLine < 1 || endLine < 1) {
             errors.push({
               line: lineNumber,
               message: "líneas deben ser >= 1",
               code: "invalid_range",
             });
             continue;
           }

           if (startLine > endLine) {
             errors.push({
               line: lineNumber,
               message: "start line must be <= end line",
               code: "invalid_range",
             });
             continue;
           }

           // El contenido está después de los parámetros hasta `-->`
           // Recolectamos el texto entre el último parámetro y `-->`
           const afterParams = match[0].slice(
             match[0].indexOf(endLine !== null ? match[3] : match[2]) + (endLine !== null ? match[3]!.length : match[2].length)
           );
           const content = afterParams.replace(/--\s*-->/g "").trim();

           // Si no hay contenido explícito, generamos un placeholder
           const finalContent = content || `<!-- replaced content lines ${startLine}-${endLine} -->`;

           directives.push({
             type: "replace",
             startLine,
             endLine,
             content: finalContent,
           });
           break;
         }

         case "add": {
           // add requiere solo startLine (línea antes de insertar)
           if (startLine < 1) {
             errors.push({
               line: lineNumber,
               message: "línea de add debe ser >= 1",
               code: "invalid_range",
             });
             continue;
           }

           // El contenido está después de los parámetros hasta `-->`
           const afterParams = match[0].slice(match[2].length + match[0].indexOf(match[2]) + match[2].length);
           // Simpler: tomar todo lo entre la directiva y -->, quitando la directiva herself
           const directiveEndIndex = match[0].indexOf("-->");
           const content = match[0].slice(
             match[0].indexOf(match[2]) + match[2].length,
             directiveEndIndex
           ).trim();

           const finalContent = content || `<!-- added before line ${startLine} -->`;

           directives.push({
             type: "add",
             targetLine: startLine,
             content: finalContent,
           });
           break;
         }

         default:
           // Directiva no reconocida; la ignoramos (no error, solo no la procesamos)
           // Podríamos empujar un error si fuera estricto, pero por diseño las ignoramos.
           break;
       }
     } catch (e) {
       errors.push({
         line: lineNumber,
         message: `error parsing directive: ${(e as Error).message}`,
         code: "malformed",
       });
     }
   }

   // NOTE: La validación de solapamientos (overlap) se hace después,
  // cuando ya conocemos el documento completo y el orden de aplicación.
  // Aquí solo reportamos sintaxis inválida.

   return { directives, errors };
 }

 /**
  * Valida que ninguna dos directivas se solapen.
  * Se aplica después del parseo, sobre el conjunto completo de directivas.
  * Retorna true si hay solapamientos, false en caso contrario.
  *
  * Dos directivas se solapan cuando sus rangos de líneas modificadas intersectan.
  * - Dos `replace` se solapan si sus rangos [start, end] intersectan.
  * - Un `replace` y un `add` se solapan si el `add` targetLine cae dentro del rango `replace`.
  * - Dos `add` con targetLines diferentes no se solapan directamente,
  *   pero si apuntan a la misma posición relativa pueden causar problemas;
  *   aquí levantamos error solo si uno queda totalmente contenido en otro.
  */
 export function checkForOverlaps(directives: ParsedDirective[]): string[] {
   const problems: string[] = [];

   for (let i = 0; i < directives.length; i++) {
     for (let j = i + 1; j < directives.length; j++) {
       const d1 = directives[i];
       const d2 = directives[j];

       if (d1.type === "replace" && d2.type === "replace") {
         // Rangos [start1,end1] y [start2,end2] se intersectan cuando:
         // start1 <= end2 && start2 <= end1
         if (d1.startLine <= d2.endLine && d2.startLine <= d1.endLine) {
           problems.push(
             `Overlap between replace directives at lines [${d1.startLine}-${d1.endLine}] and [${d2.startLine}-${d2.endLine}]`
           );
         }
       } else if (d1.type === "replace" && d2.type === "add") {
         // `add` inserta antes de targetLine2. Si targetLine2 está dentro del rango replace de d1, overlap.
         if (d2.targetLine >= d1.startLine && d2.targetLine <= d1.endLine) {
           problems.push(
             `Overlap: add before line ${d2.targetLine} falls inside replace [${d1.startLine}-${d1.endLine}]`
           );
         }
         // También revisar el caso inverso
       } else if (d2.type === "replace" && d1.type === "add") {
         if (d1.targetLine >= d2.startLine && d1.targetLine <= d2.endLine) {
           problems.push(
             `Overlap: add before line ${d1.targetLine} falls inside replace [${d2.startLine}-${d2.endLine}]`
           );
         }
       } else if (d1.type === "add" && d2.type === "add") {
         // Dos add: si apuntan a la misma targetLine, es overlap.
         if (d1.targetLine === d2.targetLine) {
           problems.push(
             `Overlap: two add directives targeting line ${d1.targetLine}`
           );
         }
       }
     }
   }

   return problems;
 }

 /**
  * Aplica las directivas a un prompt (array de líneas de string).
  * El orden de aplicación es de abajo hacia arriba (mayor índice primero)
  * para que los números de línea permanezcan válidos.
  *
  * @param lines Líneas originales del prompt (0-indexed internamente, pero directivas son 1-indexed)
  * @param directives Directivas parseadas y validadas (sin solapamientos)
  * @returns Nuevo array de líneas después de aplicar todos los parches
  *
  * Lógica:
  * 1. Ordenar directivas por índice descendente (de la última línea a la primera)
  * 2. Aplicar cada una:
    - `replace`: sustituye el segmento lines[startLine-1..endLine-1] por [content]
    - `add`: inserta content antes de lines[targetLine-1]
  * 3. Retornar el nuevo array
  */
 export function applyDirectives(
   lines: string[],
   directives: ParsedDirective[]
 ): string[] {
   // Copiar para no mutar el original
   const result = [...lines];

   // Ordenar de forma descendente por target/index para aplicar de abajo hacia arriba
   // y así los índices no se desplacen inesperadamente.
   const sorted = [...directives].sort((a, b) => {
     // Prioridad: replace antes que add si están en misma posición?
     // Aplicamos simplemente ordenado por el índice objetivo descendente.
     const idxA = a.type === "replace" ? a.endLine : a.targetLine;
     const idxB = b.type === "replace" ? b.endLine : b.targetLine;
     return idxB - idxA; // descendente
   });

   for (const dir of sorted) {
     if (dir.type === "replace") {
       // Ajustar a 0-indexed
       const zeroStart = dir.startLine - 1;
       const zeroEnd = dir.endLine; // slice end es exclusivo, por usamos endLine directamente

       // Asegurarnos de no salirnos del arreglo
       const actualEnd = Math.min(zeroEnd, result.length);
       const replaced = dir.content;

       // Reemplazamos el segmento
       result.splice(zeroStart, zeroEnd - zeroStart, replaced);
     } else if (dir.type === "add") {
       // Insertar antes de la línea targetLine (1-indexed) → índice zeroBased = targetLine-1
       const zeroBased = dir.targetLine - 1;

       // Clamp: si targetLine > lines.length, insertar al final
       const clampedBased = Math.min(zeroBased, result.length);

       result.splice(clampedBased, 0, dir.content);
     }
   }

   return result;
 }

 /**
  * Exporta una función de conveniencia que hace parseo + validación de superposición + aplicación.
  * Útil para el Patch Engine.
  */
 export function processPrompt(
   markdown: string,
   lines: string[]
 ): {
   success: boolean;
   patchedLines: string[];
   errors: { message: string; code: string; line: number }[];
   warnings: { message: string }[];
 } {
   const { directives, errors: parseErrors } = parseDirectives(markdown);
   const overlapErrors = checkForOverlaps(directives);

   const allErrors: { message: string; code: string; line: number }[] = [];

   // Errores de parsing
   for (const e of parseErrors) {
     allErrors.push({ message: e.message, code: e.code, line: e.line });
   }

   // Errores de superposición
   for (const o of overlapErrors) {
     allErrors.push({ message: o, code: "overlap", line: 0 });
   }

   if (allErrors.length > 0) {
     return { success: false, patchedLines: lines, errors: allErrors, warnings: [] };
   }

   const patchedLines = applyDirectives(lines, directives);

   const warnings: { message: string }[] = [];

   // Advertir si algunas directivas fueron ignoradas (por ejemplo, tipo desconocido)
   // Esto podría añadirse si el usuario espera que todas sean procesadas.

   return {
     success: true,
     patchedLines,
     errors: [],
     warnings,
   };
 }

 export default {
   parseDirectives,
   checkForOverlaps,
   applyDirectives,
   processPrompt,
 };