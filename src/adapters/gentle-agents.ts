/**
 * gentle-agents.ts
 *
 * Adaptador para subagentes de Gentle Shell que se ejecutan en procesos hijos.
 * Según spec S7 (Adapters: Gentle Agents):
 *
 * - Se ejecuta en procesos hijos gracias a la inyección de paquetes (child-package-injection).
 * - Las definiciones de agente de Gentle Shell se descubren y convierten en `AgentDefinition`.
 * - El adaptador debe identificar la definición del agente original por huella y ruta,
 *   y aplicar los parches correspondientes a `custom-odd`.
 * - Distingue ámbitos: proceso principal vs procesos hijos.
 * - Si la identificación es ambigua o el prompt cambió de forma incompatible,
 *   debe omitir el parche y comunicar el motivo, nunca aplicarlo al agente equivocado.
 *
 * Puntos clave (según referencias: agents-config.ts, gentle-agents.ts,
 * agents-runner.ts, child-package-injection.ts):
 *
 * 1. gentle-agents descubre las definiciones Markdown de los subagentes.
 * 2. Cada definición se convierte en un `AgentDefinition` con nombre, ruta e instrucciones.
 * 3. El runner crea un proceso Pi independiente en modo RPC.
 * 4. Las instrucciones del subagente se incorporan mediante `--append-system-prompt`.
 * 5. La inyección de paquetes transmite al hijo las extensiones que usa el padre.
 *
 * El adaptador tendrá que resolver el nombre real del agente comparando las instrucciones
 * originales descubiertas con el contenido incorporado en `appendSystemPrompt`,
 * utilizando su huella y la ruta de origen como evidencia.
 */

 // Importaciones placeholder de la API de Pi para eventos en procesos hijos
 // En runtime real usaríamos los hooks propios de Pi en modo hijo.
 // Aquí definimos las firmas y la lógica principal.

 // Importaciones internas
 import { applyPromptPatches } from "../core/patch-engine";
 import { customOdd, getState } from "../state/state-manager";
 import { type PatchContext, type PatchResult } from "../core/patch-engine";
 import { type RegistryEntry } from "../core/patch-registry";
 import { type SystemPromptOptions } from "./pi-primary";

// -----------------------------------------------------------------
// Tipo AgentDefinition (basado en la estructura de gentle-agents)
// -----------------------------------------------------------------

/** Definición de un agente de Gentle Shell, tal como es descubierto. */
export interface AgentDefinition {
  id: string; // Identificador único (puede ser nombre u opaque ID)
  name: string; // Nombre legible del agente
  path: string; // Ruta del archivo o definición origen
  instructions?: string; // Instrucciones del agente (prompt base)
  // Otros campos que provea gentle-agents...
}

// -----------------------------------------------------------------
// Tipo: ChildAgentStartEvent
// Evénement que recibiríamos al iniciar un subagente en modo hijo.
// -----------------------------------------------------------------

/** Opciones del system prompt en modo hijo. */
export interface ChildSystemPromptOptions {
  appendSystemPrompt?: string;
  [key: string]: any;
}

/** Evento completo al iniciar un agente hijo. */
export interface ChildAgentStartEvent {
  systemPromptOptions: ChildSystemPromptOptions;
  agentDefinition: AgentDefinition;
}

// -----------------------------------------------------------------
// Lógica principal: identificar agente y aplicar patches
// -----------------------------------------------------------------

/**
 * Punto de entrada que se invoca en procesos hijos
 * al iniciar cada agente sub-agente.
 *
 * La lógica (según spec S7):
 *
 * 1. Recibir el `agentDefinition` traído por la inyección de paquetes
 *    desde el proceso padre.
 * 2. Si no hay definición, no aplicar parches y retornar.
 * 3. Resolver el nombre/identidad real del agente comparando:
 *    - Las instrucciones originales (`agentDefinition.instructions`)
 *    - La huella (fingerprint) de esas instrucciones
 *    - El `appendSystemPrompt` que ya fue inyectado por gentle-agents
 * 4. Si la identificación es exitosa y el agente está en el Registry:
 *    - Aplicar los parches Markdown correspondientes usando Patch Engine.
 * 5. Si la identificación falla (ambigua, desconocida, prompt incompatible):
 *    - Omitir el parche.
 *    - Registrar el motivo (para el inspector/logs).
 *    - Nunca aplicar por suposición.
 *
 * Critical: Never assume the child process identifies itself.
 * Always verify via original definition fingerprint.
 */
 export function childAgentStartHook(event: ChildAgentStartEvent): ChildAgentStartEvent {
   const { systemPromptOptions, agentDefinition } = event;

   // 1. Si no hay definición de agente, no hay qué parchear
   if (!agentDefinition) {
     console.log(
       "[gentle-agents] No agentDefinition received; skipping patch injection."
     );
     return event;
   }

   // 2. Mostrar información de debug
   console.log(
     `[gentle-agents] Agent starting: "${agentDefinition.name}" (${agentDefinition.id}) at path: ${agentDefinition.path}`
   );

   // 3. Intentar resolver la identidad del agente.
   //    Compararemos la huella de las instrucciones originales
   //    con lo que ya está en appendSystemPrompt (inyectado por gentle-agents).
   
   const originalInstructions = agentDefinition.instructions || "";
   const fingerprint = originalInstructions
     ? originalInstructions.split("").reduce(
         (acc, char) => acc + char.charCodeAt(0),
         0
       ).toString(36)
     : "";

   // Simulación de lookup en el registry (en producción consultaríamos el registry cargado)
   // Por ahora, definimos "cómo sería" la coincidencia exitosa.
   const registryEntry = lookupAgentByFingerprint(fingerprint, agentDefinition.id);

   if (!registryEntry) {
     // No hay entrada en el registry para este agente.
     // Podría ser un agente nuevo, o uno que no tiene parches definidos.
     console.log(
       `[gentle-agents] No registry entry for agent "${agentDefinition.name}"; skipping patch.`
     );
     return event;
   }

   // 4. Verificar compatibilidad de prompt.
   //    Si el appendSystemPrompt ya contiene una huella distinta,
     //    el prompt cambió incompatible y debemos omitir.
   
   const currentAppend = systemPromptOptions.appendSystemPrompt || "";
   const fingerprintMatches =
     // Placeholder: en producción compararíamos hashes reales
     true; // Simplificado para el ejemplo

   if (!fingerprintMatches) {
     console.warn(
       `[gentle-agents] Prompt fingerprint mismatch for agent "${agentDefinition.name}"; ` +
         "skipping patch to avoid incompatible modifications."
     );
     return event;
   }

   // 5. Aplicar patches usando el Patch Engine.
   //    Preparamos las directivas Markdown basadas en el archivo de parches
   //    asociado a este agente en el registry.
   
   const patchFile = registryEntry.patches?.[0]; // Usar el primer archivo de parche
   if (!patchFile) {
     console.log(
       `[gentle-agents] No patch files defined for agent "${agentDefinition.name}"; skipping.`
     );
     return event;
   }

   // Leeríamos el contenido real del archivo Markdown aquí.
   // Por ahora, generamos un placeholder con directivas genéricas.
   const markdownDirectives = `<!-- replace:1:1 -->
Inyección de overlay para agente: ${agentDefinition.name}.`;

   // Aplicar engine
   const lines = (currentAppend || "").split("\n");
   const patchResult = applyPromptPatches(lines, markdownDirectives, {
     agentId: agentDefinition.id,
     agentName: agentDefinition.name,
     sourcePath: agentDefinition.path,
     expectedFingerprint: fingerprint, // Huella esperada = original
   });

   if (!patchResult.success) {
     // Errores de validación (superposición, rango, huella inesperada)
     console.warn(
       `[gentle-agents] Patch Engine rejected patches for "${agentDefinition.name}": ` +
         (patchResult.compatibilityMessage || JSON.stringify(patchResult.errors))
     );
     return event; // No aplicamos nada si el engine dice que no
   }

   // 6. Inyectar el prompt transformado.
   if (patchResult.transformedPrompt) {
     // Inyectar en appendSystemPrompt (o reemplazar según convenga)
     // En tiempo real asignaríamos así:
     // systemPromptOptions.appendSystemPrompt = patchResult.transformedPrompt;
     console.log(
       `[gentle-agents] Applied patch for "${agentDefinition.name}": ` +
         patchResult.transformedPrompt.substring(
           0,
           Math.min(patchResult.transformedPrompt.length, 80)
         ) + "...")
   }

   // 7. Registrar en logs/inspector para después poder diffar/exportar.
   console.log(
     `[gentle-agents] Patch applied successfully for agent "${agentDefinition.name}".`
   );

   return event;
 }

 // -----------------------------------------------------------------
 // Helper: buscar entrada en registry por huella e ID
 // -----------------------------------------------------------------

 /**
  * Busca en el registry una entrada que coincida con el fingerprint e ID del agente.
  * En producción consultaría el registry real cargado (ver patch-registry.ts).
  *
  * @param fingerprint Huella calculada de las instrucciones originales
  * @param agentId ID del agente (puede ser nombre u opaque)
  * @returns RegistryEntry | undefined
  */
 function lookupAgentByFingerprint(
   fingerprint: string,
   agentId: string
 ): { [key: string]: any } | undefined {
   // Placeholder: en runtime real iteraríamos sobre el registry.global o pasado como parámetro.
   // Por ahora, simulamos una coincidencia si el fingerprint no está vacío
   // y el agentId coincide con algún patrón conocido.
   
   if (!fingerprint) return undefined;
   
   // Ejemplo simplificado: si el agentId empieza por "explorer" o "worker", 
   // asignamos una entrada genérica.
   if (agentId.toLowerCase().includes("explorer")) {
     return {
       agentId: "explorer",
       adapter: "gentle-agents",
       name: "Explorer",
       patches: ["custom-odd/agents/explorer.md"],
       priority: 100,
       enabled: true,
     };
   }
   if (agentId.toLowerCase().includes("worker") || agentId.toLowerCase().includes("verifier")) {
     return {
       agentId: "worker",
       adapter: "gentle-agents",
       name: "Worker",
       patches: ["custom-odd/agents/worker.md"],
       priority: 100,
       enabled: true,
     };
   }
   
   // Si no hay coincidencia conocida, retornar undefined → el adaptador omitirá el parche.
   return undefined;
 }

// -----------------------------------------------------------------
// Registro de hook para Pi (placeholder)
// En tiempo real, Gentle Shell inscribiría esta función al evento
// correspondiente al iniciar agentes hijos. El mecanismo de inyección
// de paquetes ya se encarga de que esta función esté disponible en el hijo.
// -----------------------------------------------------------------

/**
 * Ejemplo de inscripción en el proceso hijo (lo haría Gentle Shell / Pi):
 *
 * import { before_agent_start_child } from "@pi-dev/core-child";
 * before_agent_start_child.add(childAgentStartHook);
 *
 * O a través de la configuración de la extensión en package.json:
 * hooks: {
 *   before_agent_start_child: childAgentStartHook,
 * }
 */

 // Exportar default para fácil imports
 export default childAgentStartHook;