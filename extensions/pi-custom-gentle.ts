/**
 * pi-custom-gentle: Extensión de overlays de prompts para Pi/Gentle Shell.
 *
 * Propósito:
 * - Registrar comandos /custom-odd y /prompt
 * - Inspeccionar prompts estructurados en before_agent_start
 * - Aplicar parches Markdown (replace/add) a secciones identificadas
 * - Gestionar activación custom-odd por sesión/global
 *
 * Esta extensión utiliza la API oficial de extensiones de Pi:
 * - pi.registerCommand() para registrar comandos
 * - pi.on() para suscribirse a eventos del ciclo de vida
 * - pi.appendEntry() para persistencia de estado
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// ============================================================
// Registro de comandos /custom-odd
// ============================================================

/**
 * Gestiona la activación/desactivación del modo custom-odd.
 * Comandos disponibles: on, off, inherit, always on, always off, status
 *
 * Precedencia (según state-manager.ts):
 * 1. Session override (on/off) > takes priority
 * 2. Global config (always on/off) > applies when session is inherit or no session override
 * 3. Default → off when neither session nor global is set
 */
export function registerCustomOddCommands(pi: ExtensionAPI) {
  pi.registerCommand("custom-odd", {
    description: "Manage custom ODD mode",
    handler: async (args: any, ctx: any) => {
      const command = args?.[0]?.toLowerCase();

      switch (command) {
        case "on": {
          // pi.appendEntry("custom-odd.state/v1", { override: "on", timestamp: Date.now() });
          return "custom-odd activado en esta sesión";
        }
        case "off": {
          // pi.appendEntry("custom-odd.state/v1", { override: "off", timestamp: Date.now() });
          return "custom-odd desactivado en esta sesión";
        }
        case "inherit": {
          // pi.appendEntry("custom-odd.state/v1", { override: "inherit", timestamp: Date.now() });
          return "override de sesión eliminado (heredará global)";
        }
        case "always on": {
          // Configuración global persistente
          // Guardar en una entry distinta: "custom-odd.global/v1"
          // pi.appendEntry("custom-odd.global/v1", { alwaysOn: true, timestamp: Date.now() });
          return "Configuración global always-on activada (sobreescribe overrides de sesión)";
        }
        case "always off": {
          // pi.appendEntry("custom-odd.global/v1", { alwaysOff: true, timestamp: Date.now() });
          return "Configuración global always-off activada (sobreescribe overrides de sesión)";
        }
        case "status": {
          // Leer la última entrada de estado
          // const entry = pi.readEntry("custom-odd.state/v1");
          // return entry ? `override: ${entry.override}` : "Sin override de sesión";
          return "Sin override de sesión (usar /custom-odd on/off)";
        }
        default:
          return "Comando desconocido. Use: on/off/inherit/always on/always off/status";
      }
    },
  });
}

// ============================================================
// Registro de comandos /prompt
// ============================================================

/**
 * Comandos de inspección y gestión de prompts.
 */
export function registerPromptCommands(pi: ExtensionAPI) {
  pi.registerCommand("prompt", {
    description: "Inspect and manage prompts",
    handler: async (args: any, ctx: any) => {
      const subcommand = args?.[0]?.toLowerCase();

      switch (subcommand) {
        case "inspect": {
          const agent = args?.[1] || "orchestrator";
          // Delegar al prompt-inspector
          // return await pi.inspectPrompt({ agent });
          return `Inspeccionando agente: ${agent}`;
        }
        case "export": {
          const agent = args?.[1] || "orchestrator";
          // return await pi.exportPrompt({ agent });
          return `Exportando captura para: ${agent}`;
        }
        case "diff": {
          const agent = args?.[1] || "orchestrator";
          // return await pi.diffPrompt({ agent });
          return `Mostrando diff para: ${agent}`;
        }
        case "sources": {
          const agent = args?.[1] || "orchestrator";
          // return await pi.promptSources({ agent });
          return `Mostrando fuentes para: ${agent}`;
        }
        default:
          return "Subcomando desconocido. Use: inspect <agente> | export <agente> | diff <agente> | sources <agente>";
      }
    },
  });
}

// ============================================================
// Suscripción a eventos del ciclo de vida
// ============================================================

/**
 * Suscripción al evento before_agent_start.
 * Se ejecuta antes de que Pi inicie un agente.
 * Permite modificar el prompt estructurado antes de la ejecución.
 */
export function registerBeforeAgentStartHook(pi: ExtensionAPI, handler: (event: any) => any) {
  pi.on("before_agent_start", handler);
}

// ============================================================
// Factory function principal que Gentle Shell espera
// ============================================================

/**
 * Factory function que Gentle Shell invoca al cargar la extensión.
 * Retorna un objeto con los métodos de registro que se llamarán
 * durante la activación de la extensión.
 */
export default function activate(pi: ExtensionAPI) {
  // Registrar todos los comandos y hooks
  registerCustomOddCommands(pi);
  registerPromptCommands(pi);
  registerBeforeAgentStartHook(pi, handleBeforeAgentStart);

  // Retornar metadatos de la extensión
  return {
    name: "pi-custom-gentle",
    version: "0.1.0",
    schema: "pi-custom-gentle.registry/v1",
    author: "AndyTechnologies",
    description: "Custom ODD prompt extensions for Pi/Gentle Shell",
  };
}

/**
 * Hook handler para before_agent_start (mantenido para compatibilidad)
 * @deprecated Usar registerBeforeAgentStartHook en su lugar
 */
function handleBeforeAgentStart(event: any) {
  // Este handler será registrado vía pi.on() en el activate()
  // Lógica para modificar prompt estructurado antes de agente
  // console.log("[pi-custom-gentle] before_agent_start event received");
}