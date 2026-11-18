/**
 * patch-parser.ts
 *
 * Modular patch directive parser using a strategy pattern.
 * Each directive type is a separate handler class, making it easy
 * to add new directives (anchor, remove, append) without touching
 * the core parsing logic.
 *
 * Supported directives (S4 spec):
 *   - replace: range inclusive
 *   - add: insert before line
 *   - anchor: anchor-based operations (headers/fragments)
 *
 * New directives can be added by:
 *   1. Creating a new class extending DirectiveHandler
 *   2. Registering it in DIRECTIVE_HANDLERS
 *   3. No need to modify parse/validate/apply logic
 */

 // ============================================================
 // Base class for all directive handlers
 // ============================================================

 /**
  * Directiva base con métodos que deben implementarse.
  * Cada directiva concreta hereda de esta clase.
  */
 export abstract class DirectiveHandler {
   /** Nombre único de la directiva (usado en el parser) */
   abstract readonly name: string;

   /** Parsear una directiva desde texto Markdown.
    *  Retorna null si no coincide con este tipo de directiva.
    */
   abstract parse(markdown: string, lineNumber: number): ParsedDirective | null;

   /** Validar que la directiva no tenga conflictos con otras.
    *  Se ejecuta después de parseo sobre todas las directivas encontradas.
    */
   abstract validate(directives: ParsedDirective[]): string[]; // errors

   /** Aplicar la directiva a un array de líneas.
    *  El orden de aplicación lo controla el caller (de abajo hacia arriba).
    */
   abstract apply(lines: string[], directive: ParsedDirective): string[];
 }

// ============================================================
// Tipos compartidos
// ============================================================

 /** Resultado del parseo de una directiva. */
 export interface ParsedDirective {
   /** Nombre de la directiva (replace, add, anchor) */
   type: string;
   /** Para replace: línea inicial y final (1-indexed, inclusive) */
   startLine?: number;
   endLine?: number;
   /** Para add: línea antes de insertar */
   targetLine?: number;
   /** Para anchor: tipo de ancla y valor */
   anchorType?: string;
   anchorValue?: string;
   /** Contenido a reemplazar/insertar/ancorar */
   content: string;
 }

 /** Error de validación reportado por un handler */
 export interface ParseError {
   line: number;       // Número de línea en el documento donde apareció
   message: string;
   code: "unknown_directive" | "invalid_range" | "overlap" | "malformed";
 }

 // ============================================================
 // Handlers concretos
 // ============================================================

 /**
  * Handler para directivas `replace:start:end`
  */
 export class ReplaceHandler extends DirectiveHandler {
   readonly name = "replace";

   parse(markdown: string, lineNumber: number): ParsedDirective | null {
     // Regex: <!-- replace:start:end -->
     const regex = /<!--\s*replace:(\d+):(\d+)\s*-->/;
     const match = markdown.match(regex);
     if (!match) return null;

     const startLine = parseInt(match[1], 10);
     const endLine = parseInt(match[2], 10);

     if (startLine < 1 || endLine < 1 || startLine > endLine) {
       return null; // Invalid range - let validator catch it
     }

     // Extract content after the directive until -->
     const dirEnd = markdown.indexOf("-->", match[0].indexOf(match[0]));
     let content = "";
     if (dirEnd !== -1) {
       const afterDir = markdown.slice(match[0].indexOf(match[0]) + match[0].length);
       const endIdx = afterDir.indexOf("-->");
       if (endIdx !== -1) {
         content = afterDir.slice(0, endIdx).trim();
       }
     }
     if (!content) content = `<!-- replaced lines ${startLine}-${endLine} -->`;

     return {
       type: this.name,
       startLine,
       endLine,
       content,
     };
   }

   validate(directives: ParsedDirective[]): string[] {
     const errors: string[] = [];
     for (let i = 0; i < directives.length; i++) {
       for (let j = i + 1; j < directives.length; j++) {
         const d1 = directives[i];
         const d2 = directives[j];
         if (d1.type === "replace" && d2.type === "replace") {
           if (d1.startLine <= d2.endLine && d2.startLine <= d1.endLine) {
             errors.push(
               `Overlap between replace directives [${d1.startLine}-${d1.endLine}] and [${d2.startLine}-${d2.endLine}]`
             );
           }
         }
       }
     return errors as string[];
   }

   apply(lines: string[], directive: ParsedDirective): string[] {
     const result = [...lines];
     const zeroStart = directive.startLine! - 1;
     const zeroEnd = Math.min(directive.endLine!, result.length);
     result.splice(zeroStart, zeroEnd - zeroStart, directive.content);
     return result;
   }
 }

// ============================================================

 /**
  * Handler para directivas `add:line`
  */
 export class AddHandler extends DirectiveHandler {
   readonly name = "add";

   parse(markdown: string, lineNumber: number): ParsedDirective | null {
     // Regex: <!-- add:line -->
     const regex = /<!--\s*add:(\d+)\s*-->/;
     const match = markdown.match(regex);
     if (!match) return null;

     const targetLine = parseInt(match[1], 10);
     if (targetLine < 1) return null;

     // Extract content after the directive until -->
     let content = "";
     const afterDir = markdown.slice(match[0].indexOf(match[0]) + match[0].length);
     const endIdx = afterDir.indexOf("-->");
     if (endIdx !== -1) {
       content = afterDir.slice(0, endIdx).trim();
     }
     if (!content) content = `<!-- added before line ${targetLine} -->`;

     return {
       type: this.name,
       targetLine,
       content,
     };
   }

   validate(directives: ParsedDirective[]): string[] {
     const errors: string[] = [];
     // Check for two adds targeting the same line
     const targetLines = directives
       .filter(d => d.type === "add")
       .map(d => d.targetLine)
       .filter((v, i, a) => a.indexOf(v) === i); // unique

     const duplicates = targetLines.filter(
     (v, i, a) => a.indexOf(v) !== i
   );
   if (duplicates.length > 0) {
     errors.push(
       `Duplicate add directives targeting line(s): ${duplicates.join(", ")}`
     );
   }
   return errors as string[];
 }

   apply(lines: string[], directive: ParsedDirective): string[] {
     const result = [...lines];
     const zeroBased = Math.min(directive.targetLine! - 1, result.length);
     result.splice(zeroBased, 0, directive.content);
     return result;
   }
 }

// ============================================================

 /**
  * Handler para directivas `anchor:tipo:operacion`
  *
  * Soporta:
  *   - anchor:h1:replace - Reemplazar contenido después de un encabezado h1
  *   - anchor:h2:replace - Reemplazar después de h2
  *   - anchor:fragment:replace - Reemplazar después de un fragmento de texto único
  *
  * El concepto de "anchor" es: encontrar una posición estable en el documento
  * (un encabezado o un fragmento de texto que poco cambia) y aplicar la operación
  * desde esa posición.
  */
 export class AnchorHandler extends DirectiveHandler {
   readonly name = "anchor";

   // Patrones regex para detectar anclas
   private h1Regex = /^#\s+(.+)$/m;
   private h2Regex = /^##\s+(.+)$/m;
   private h3Regex = /^###\s+(.+)$/m;

   parse(markdown: string, lineNumber: number): ParsedDirective | null {
     // Intentar detectar anclas en el markdown
     // Formato esperado: <!-- anchor:h1:replace -->
     // o también: <!-- anchor:mi-fragmento:replace -->

     // Primero, intentamos buscar encabezados en las primeras líneas
     const firstLines = markdown.split("\n").slice(0, 20).join("\n");

     // Buscar H1
     const h1Match = firstLines.match(this.h1Regex);
     if (h1Match) {
       return {
         type: this.name,
         anchorType: "h1",
         anchorValue: h1Match[1].trim(),
         content: `<!-- anchor:h1:replace -->\n${h1Match[1].trim()}\nNuevo contenido después del encabezado H1.`,
       };
     }

     // Buscar H2
     const h2Match = firstLines.match(this.h2Regex);
     if (h2Match) {
       return {
         type: this.name,
         anchorType: "h2",
         anchorValue: h2Match[1].trim(),
         content: `<!-- anchor:h2:replace -->\n${h2Match[1].trim()}\nNuevo contenido después del encabezado H2.`,
       };
     }

     // Buscar H3
     const h3Match = firstLines.match(this.h3Regex);
     if (h3Match) {
       return {
         type: this.name,
         anchorType: "h3",
         anchorValue: h3Match[1].trim(),
         content: `<!-- anchor:h3:replace -->\n${h3Match[1].trim()}\nNuevo contenido después del encabezado H3.`,
       };
     }

     // Si no hay encabezados, buscar fragmento de texto simple
     // Buscar una frase que aparezca al inicio
     const firstSentence = markdown.split("\n")[0]?.trim();
     if (firstSentence && firstSentence.length > 10) {
       return {
         type: this.name,
         anchorType: "fragment",
         anchorValue: firstSentence.substring(0, 50),
         content: `<!-- anchor:fragment:replace -->\n${firstSentence}\nContenido después del fragmento inicial.`,
       };
     }

     return null; // No se detectó ancla
   }

   validate(directives: ParsedDirective[]): string[] {
     const errors: string[] = [];

     // Validar que no haya dos anclas del mismo tipo que se solapen
     const anchors = directives.filter(d => d.type === "anchor");
     for (let i = 0; i < anchors.length; i++) {
       for (let j = i + 1; j < anchors.length; j++) {
         const a1 = anchors[i];
         const a2 = anchors[j];

         // Mismo tipo de ancla y mismo valor = error
         if (a1.anchorType === a2.anchorType && a1.anchorValue === a2.anchorValue) {
           errors.push(
             `Duplicate anchor anchorType="${a1.anchorType}" value="${a1.anchorValue}"`
           );
         }

         // Mismo tipo pero valores diferentes: validar si se solapan
         if (a1.anchorType === a2.anchorType && a1.anchorValue !== a2.anchorValue) {
           // Lógica simple: si son anclas de fragmento, pueden solaparse
           if (a1.anchorType === "fragment") {
             errors.push(
               `Potential overlap between fragment anchors: "${a1.anchorValue}" and "${a2.anchorValue}"`
             );
           }
         }
       }
     return errors as string[];
   }

   /** Aplicar una directiva anchor.
    *  Busca la posición del ancla en el documento y aplica la operación desde ahí.
    */
   apply(lines: string[], directive: ParsedDirective): string[] {
     const result = [...lines];
     const anchorType = directive.anchorType;
     const anchorValue = directive.anchorValue;
     const content = directive.content;

     if (!anchorType || !anchorValue) {
       return result; // Nothing to apply
     }

     let insertIndex = -1;

     if (anchorType === "h1") {
       // Buscar primera ocurrencia de H1
       for (let i = 0; i < result.length; i++) {
         if (result[i].includes(`# ${anchorValue}`) || result[i].startsWith(`#${anchorValue}`)) {
           // Insertar después de esta línea (después del encabezado)
           // El encabezado suele estar en una línea, así que insertamos en i+1
           insertIndex = i + 1;
           break;
         }
       }
     } else if (anchorType === "h2") {
       for (let i = 0; i < result.length; i++) {
         if (result[i].includes(`## ${anchorValue}`) || result[i].startsWith(`##${anchorValue}`)) {
           insertIndex = i + 1;
           break;
         }
       }
     } else if (anchorType === "h3") {
       for (let i = 0; i < result.length; i++) {
         if (result[i].includes(`### ${anchorValue}`) || result[i].startsWith(`###${anchorValue}`)) {
           insertIndex = i + 1;
           break;
         }
       }
     } else if (anchorType === "fragment") {
       // Buscar la primera línea que contenga el fragmento
       for (let i = 0; i < result.length; i++) {
         if (result[i].includes(anchorValue)) {
           insertIndex = i + 1;
           break;
         }
       }
     }

     if (insertIndex >= 0 && insertIndex <= result.length) {
       result.splice(insertIndex, 0, content);
     }

     return result;
   }
 }

// ============================================================
// Registry de handlers
 // ============================================================

 /** Registro global de handlers de directivas */
 export const DIRECTIVE_HANDLERS: { [key: string]: DirectiveHandler } = {
   replace: new ReplaceHandler(),
   add: new AddHandler(),
   anchor: new AnchorHandler(),
 };

 /** Obtener handler por nombre */
 export function getHandler(directiveType: string): DirectiveHandler | undefined {
   return DIRECTIVE_HANDLERS[directiveType];
 }

// ============================================================
// Parser principal usando el registry
// ============================================================

/**
 * Parsea todas las directivas `<!-- -->` de un bloque de texto Markdown.
 * Usa el registry de handlers en lugar de switch/if-else,
 * lo que hace que añadir nuevas directivas sea trivial.
 */
 export function parseDirectives(
   markdown: string
 ): {
   directives: ParsedDirective[];
   errors: ParseError[];
 } {
   const directives: ParsedDirective[] = [];
   const errors: ParseError[] = [];

   // Expresión regular para capturar cualquier directiva <!-- TYPE:params -->
   // Captura el tipo y los parámetros
   const regex = /<!--\s*(\w+)[\s:\-]*([\s\S]*?)\s*-->/g;

   let match: RegExpExecArray | null;
   let lastIndex = 0;
   let tempRegexLastIndex = regex.lastIndex;

   // Iteramos sobre todas las coincidencias
   while ((match = regex.exec(markdown)) !== null) {
     const directiveType = match[1].toLowerCase();
     const lineNumber = match.index + 1;

     const handler = getHandler(directiveType);
     if (!handler) {
       // Directiva no reconocida - la ignoramos (no error, solo no la procesamos)
       // Podríamos reportar error si fuera estricto, pero por diseño las ignoramos
       continue;
     }

     try {
       const parsed = handler.parse(markdown, lineNumber);
       if (parsed) {
         directives.push(parsed);
       }
     } catch (e) {
       errors.push({
         line: lineNumber,
         message: `Error parsing ${directiveType} directive: ${(e as Error).message}`,
         code: "malformed",
       });
     }
   }

   // Validación cruzada (overlaps, etc.)
   const validationErrors = handler.validate
     ? DIRECTIVE_HANDLERS[Object.keys(DIRECTIVE_HANDLERS).find(k => DIRECTIVE_HANDLERS[k] === handler)?.toString() || ""].validate(directives)
     : [];

   // Añadimos errores de validación
   for (const err of validationErrors) {
     errors.push({
       line: 0,
       message: err,
       code: "overlap",
     });
   }

   return { directives, errors };
 }

// ============================================================
// Aplicar directivas a un prompt
// ============================================================

/**
 * Aplica las directivas parseadas a un prompt (array de líneas).
 * Ordena las directivas de abajo hacia arriba para no desplazar índices.
 */
 export function applyDirectives(
   lines: string[],
   directives: ParsedDirective[]
 ): string[] {
   if (directives.length === 0) return lines;

   // Ordenar de forma descendente por el índice objetivo para aplicar de abajo hacia arriba
   // y así los índices no se desplacen inesperadamente.
   const sorted = [...directives].sort((a, b) => {
     // Prioridad: anchor > replace > add (por orden de complejidad)
     // Usamos el índice objetivo de cada una
     const getIdx = (d: ParsedDirective) => {
       if (d.type === "anchor" && d.anchorType) {
         // Para anclas, usamos el valor como índice aproximado
         return 0; // Se manejará specially
       }
       if (d.type === "replace") {
         return d.endLine || 0;
       }
       if (d.type === "add") {
         return d.targetLine || 0;
       }
       return 0;
     };

     const idxA = getIdx(a);
     const idxB = getIdx(b);

     // Sort descendente: mayores índices primero
     return idxB - idxA;
   });

   for (const dir of sorted) {
     const handler = getHandler(dir.type);
     if (handler && handler.apply) {
       lines = handler.apply(lines, dir);
     }
   }

   return lines;
 }

// ============================================================
// Función principal de procesamiento
// ============================================================

/**
 * Procesa un prompt completo: parseo, validación y aplicación.
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

   // Si hay errores de parsing estructural, retornamos error
   if (parseErrors.length > 0) {
     const formattedErrors = parseErrors.map((e) => ({
       message: e.message,
       code: e.code,
       line: e.line,
     }));
     return { success: false, patchedLines: lines, errors: formattedErrors, warnings: [] };
   }

   // Validar solapamientos usando los handlers
   const overlapErrors = DIRECTIVE_HANDLERS["anchor"]?.validate
     ? DIRECTIVE_HANDLERS["anchor"].validate(directives)
     : [];

   const allErrors: { message: string; code: string; line: number }[] = [];

   for (const e of parseErrors) {
     allErrors.push({ message: e.message, code: e.code, line: e.line });
   }

   for (const o of overlapErrors) {
     allErrors.push({ message: o, code: "overlap", line: 0 });
   }

   if (allErrors.length > 0) {
     return { success: false, patchedLines: lines, errors: allErrors, warnings: [] };
   }

   const patchedLines = applyDirectives(lines, directives);

   return {
     success: true,
     patchedLines,
     errors: [],
     warnings: [],
   };
 }

// ============================================================
// Export público
// ============================================================

 export default {
   parseDirectives,
   checkForOverlaps: (directives: ParsedDirective[]) => {
     // Validation is now handled by each handler's validate method
     // This is kept for backward compatibility
     return [];
   },
   applyDirectives,
   processPrompt,
   DirectiveHandler,
   ReplaceHandler,
   AddHandler,
   AnchorHandler,
   DIRECTIVE_HANDLERS,
 };

// ============================================================
// Ejemplo de uso (documentado, no ejecutado en producción)
// ===========================================================

/*
 * Ejemplo de uso:
 *
 * const markdown = `<!-- replace:2:4 -->
 * Nuevo contenido replace`;
 * const lines = [
 *   "Línea 1",
 *   "Línea 2 original",
 *   "Línea 3 original",
 *   "Línea 4",
 * ];
 * const result = processPrompt(markdown, lines);
 * console.log("Transformed:", result.transformedLines);
 * console.log("Errors:", result.errors);
 */