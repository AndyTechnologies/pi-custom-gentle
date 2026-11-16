/**
 * patch-registry.ts
 *
 * Registro de destinos de parches.
 * Según spec S5 (Prompt Registry):
 *   - Indica qué parches corresponden a cada agente.
 *   - Contiene IDs, adaptadores, nombres, prioridades y flag `enabled`.
 *   - Permite añadir colecciones futuras sin modificar el código principal.
 *
 * Estructura conceptual (según spec):
 * {
 *   "schema": "pi-custom-gentle.registry/v1",
 *   "targets": [
 *     {
 *       "id": "orchestrator",
 *       "adapter": "pi-primary",
 *       "name": "orchestrator",
 *       "patches": ["custom-odd/orchestrator.md"],
 *       "priority": 100,
 *       "enabled": true
 *     },
 *     {
 *       "id": "explorer",
 *       "adapter": "gentle-agents",
 *       "name": "explorer",
 *       "patches": ["custom-odd/agents/explorer.md"],
 *       "priority": 100,
 *       "enabled": true
 *     }
 *   ]
 * }
 *
 * Este archivo expone:
 * - loadRegistryFromJson: cargar un registro desde un objeto JSON (o ruta de archivo en tiempo real)
 * - lookupAgentEntries: encontrar entradas para un agente dado su ID
 * - addEntry: añadir una nueva entrada (útil para desarrollo)
 * - listAll: listar todos los agentes registrados
 */

 // Tipos del registro
 export interface RegistryEntry {
   agentId: string;
   adapter: string;
   name: string;
   patches: string[]; // rutas relativas a archivos Markdown
   priority: number;
   enabled: boolean;
 }

 export interface RegistrySchema {
   schema: string;
   targets: RegistryEntry[];
 }

 // Registry en memoria (en producción se cargaría desde un archivo JSON en la raíz)
 // Aquí almacenamos un registro vacío/placeholder que el usuario puede completar.
 //
 // Ejemplo de cómo quedaría tras el primer commit:
 //
 // const exampleRegistry: RegistrySchema = {
 //   schema: "pi-custom-gentle.registry/v1",
 //   targets: [
 //     {
 //       agentId: "orchestrator",
 //       adapter: "pi-primary",
 //       name: "Orchestrator",
 //       patches: ["custom-odd/orchestrator.md"],
 //       priority: 100,
 //       enabled: true,
 //     },
 //   ],
 // };
 //
 // Por ahora exportamos una función "vacía" que lee de un objeto pasable,
 // permitiendo al usuario inyectar su propio registro al llamar al engine.

 /** Carga un objeto RegistrySchema desde un objeto JSON / objeto JS. */
 export function loadRegistryFromJson(
   raw: unknown
 ): RegistrySchema | null {
   if (!raw || typeof raw !== "object") {
     console.warn("[patch-registry] Input is not a valid object; returning null.");
     return null;
   }

   const obj = raw as Record<string, unknown>;

   // Validar esquema mínimo
   if (typeof obj.schema !== "string") {
     console.warn("[patch-registry] Missing or invalid 'schema' field.");
     return null;
   }

   const targets: RegistryEntry[] = [];

   if (obj.targets && Array.isArray(obj.targets)) {
     for (const entry of obj.targets) {
       if (
         entry &&
         typeof entry === "object" &&
         typeof (entry as any).agentId === "string" &&
         typeof (entry as any).adapter === "string" &&
         typeof (entry as any).name === "string" &&
         Array.isArray((entry as any).patches) &&
         typeof (entry as any).priority === "number" &&
         typeof (entry as any).enabled === "boolean"
       ) {
         targets.push({
           agentId: (entry as any).agentId,
           adapter: (entry as any).adapter,
           name: (entry as any).name,
           patches: (entry as any).patches,
           priority: (entry as any).priority,
           enabled: (entry as any).enabled,
         });
       } else {
         console.warn(
           `[patch-registry] Skipping malformed registry entry: ${JSON.stringify(entry)}`
         );
       }
     }
   }

   return {
     schema: obj.schema,
     targets,
   };
 }

 /** Busca las entradas del registro que coinciden con el agenteId dado. */
 export function lookupAgentEntries(
   registry: RegistrySchema,
   agentId: string
 ): RegistryEntry[] {
   if (!registry || !registry.targets) return [];

   return registry.targets.filter((entry) => entry.agentId === agentId && entry.enabled);
 }

 /** Lista todos los agentes únicos registrados. */
 export function listAllAgents(registry: RegistrySchema): string[] {
   if (!registry) return [];

   const seen = new Set<string>();
   for (const entry of registry.targets) {
     seen.add(entry.agentId);
   }
   return Array.from(seen);
 }

 /** Filtra las directivas Markdown aplicando solo los parches correspondientes a un agente. */
 export function filterDirectivesForAgent(
   markdown: string,
   agentId: string,
   registry: RegistrySchema
 ): {
   filteredMarkdown: string;
   appliedPatches: string[];
   skippedPatches: string[];
 } {
   const entries = lookupAgentEntries(registry, agentId);

   if (entries.length === 0) {
     // No hay entradas para este agente; devolver el markdown original y listas vacías
     return { filteredMarkdown: markdown, appliedPatches: [], skippedPatches: [] };
   }

   // Simplemente retornamos el markdown tal cual, pero registramos qué archivos de parche
   // estarían aplicados. En una implementación futura, el motor leería los archivos
   // Markdown reales y seleccionaría solo las directivas pertenecientes a estos.
   const allPatchFiles = entries.flatMap((e) => e.patches);
   const skippedPatches = allPatchFiles.filter(
     (f) => !markdown.includes(f) // placehold: checks if filename mentioned
   );

   // Por ahora retornamos el markdown sin modificar pero con el registro de qué parches
   // corresponden a este agente. El filtrado real se hace en el Patch Engine usando
   // los archivos Markdown reales en disco.
   return {
     filteredMarkdown: markdown,
     appliedPatches: allPatchFiles,
     skippedPatches,
   };
 }

 // -----------------------------------------------------
 // Registro ejemplo en memoria (para desarrollo y pruebas)
 // -----------------------------------------------------

 // Registry por defecto vacío - el usuario deberá proveer el suyo al instalar/usar el engine.
 // Se puede sobreescribir pasando un registry personalizado a applyPromptPatches.
 export const DEFAULT_REGISTRY: RegistrySchema = {
   schema: "pi-custom-gentle.registry/v1",
   targets: [],
 };

 // Exportamos también una versión "completa" ejemplo para que el usuario copie/pega:
 export const EXAMPLE_REGISTRY: RegistrySchema = {
   schema: "pi-custom-gentle.registry/v1",
   targets: [
     {
       agentId: "orchestrator",
       adapter: "pi-primary",
       name: "Orchestrator",
       patches: ["custom-odd/orchestrator.md"],
       priority: 100,
       enabled: true,
     },
     {
       agentId: "explorer",
       adapter: "gentle-agents",
       name: "Explorer",
       patches: ["custom-odd/agents/explorer.md"],
       priority: 100,
       enabled: true,
     },
   ],
 };