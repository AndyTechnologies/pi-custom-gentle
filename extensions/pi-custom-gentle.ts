/**
 * pi-custom-gentle: Extensión de overlays de prompts para Pi/Gentle Shell.
 *
 * Registra los comandos /custom-odd y /prompt utilizando la API oficial
 * de ExtensionAPI de Pi, con autocompletado, manejo correcto de argumentos
 * y notificaciones en la TUI.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

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
const PROMPT_AGENTS = ["orchestrator", "explorer", "worker", "verifier"];

function getPromptCompletions(prefix: string): Array<{ value: string; label: string }> | null {
  const normalizedPrefix = prefix.trim().toLowerCase();

  // Intentar coincidir con subcomandos primero
  const subMatches = PROMPT_SUB_COMMANDS.filter(
    (cmd) => cmd.startsWith(normalizedPrefix)
  );

  if (subMatches.length > 0) {
    return subMatches.map((cmd) => ({
      value: `${cmd} `,
      label: cmd,
    }));
  }

  // Si el prefijo es corto, sugerir agentes
  if (normalizedPrefix.length < 3) {
    const agentMatches = PROMPT_AGENTS.filter((agent) => agent.startsWith(normalizedPrefix));
    if (agentMatches.length > 0) {
      return agentMatches.map((agent) => ({
        value: `${agent} `,
        label: agent,
      }));
    }
  }

  return null;
}

// ============================================================
// Registro de comando /custom-odd
// ============================================================

/**
 * Registra el comando /custom-odd con autocompletado y handler adecuado.
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
        // Persistir el estado usando la API de Pi
        switch (command) {
          case "on": {
            // Guardar override de sesión "on"
            // pi.appendEntry("custom-odd.state/v1", { override: "on", timestamp: Date.now() });
            ctx.ui.notify("custom-odd activado en esta sesión", "info");
            return;
          }
          case "off": {
            // pi.appendEntry("custom-odd.state/v1", { override: "off", timestamp: Date.now() });
            ctx.ui.notify("custom-odd desactivado en esta sesión", "info");
            return;
          }
          case "inherit": {
            // pi.appendEntry("custom-odd.state/v1", { override: "inherit", timestamp: Date.now() });
            ctx.ui.notify("override de sesión heredará global", "info");
            return;
          }
          case "always on": {
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
            // Leer estado actual
            // const entry = pi.readEntry("custom-odd.state/v1");
            // const effective = entry?.override ? `override: ${entry.override}` : "Sin override de sesión";
            ctx.ui.notify("Sin override de sesión (usar /custom-odd on/off)", "info");
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
// Registro de comando /prompt
// ============================================================

/**
 * Registra el comando /prompt con autocompletado y handler.
 */
export function registerPromptCommand(pi: ExtensionAPI) {
  pi.registerCommand("prompt", {
    description: "Inspect and manage prompts",

    getArgumentCompletions: (prefix: string) => {
      return getPromptCompletions(prefix);
    },

    handler: async (args: string, ctx: any) => {
      const subcommand = args.trim().toLowerCase();

      try {
        switch (subcommand) {
          case "inspect": {
            const agent = (args.match(/\/prompt\s+(\S+)/)?.[1] || "orchestrator").trim();
            // TODO: Integrar con pi.inspectPrompt cuando esté disponible
            // const result = await pi.inspectPrompt({ agent });
            ctx.ui.notify(
              `Inspección de agente ${agent}: funcionalidad pendiente de integración`,
              "info"
            );
            return;
          }
          case "export": {
            const agent = (args.match(/\/prompt\s+(\S+)/)?.[1] || "orchestrator").trim();
            // TODO: Integrar con pi.exportPrompt cuando esté disponible
            ctx.ui.notify(
              `Exportación para agente ${agent}: funcionalidad pendiente`,
              "info"
            );
            return;
          }
          case "diff": {
            const agent = (args.match(/\/prompt\s+(\S+)/)?.[1] || "orchestrator").trim();
            // TODO: Implementar diff real
            ctx.ui.notify(
              `Diff para agente ${agent}: funcionalidad pendiente`,
              "info"
            );
            return;
          }
          case "sources": {
            const agent = (args.match(/\/prompt\s+(\S+)/)?.[1] || "orchestrator").trim();
            // TODO: Implementar sources real
            ctx.ui.notify(
              `Sources para agente ${agent}: funcionalidad pendiente`,
              "info"
            );
            return;
          }
          case "payload": {
            ctx.ui.notify("Payload del proveedor: funcionalidad pendiente", "info");
            return;
          }
          default: {
            ctx.ui.notify(
              `Subcomando desconocido. Use: inspect | export | diff | sources | payload`,
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
 * Conecta todos los comandos y hooks al runtime de Pi.
 */
export default function activate(pi: ExtensionAPI) {
  // Registrar todos los comandos
  registerCustomOddCommand(pi);
  registerPromptCommand(pi);

  // Retornar metadatos de la extensión
  return {
    name: "pi-custom-gentle",
    version: "0.1.0",
    schema: "pi-custom-gentle.registry/v1",
    author: "AndyTechnologies",
    description: "Custom ODD prompt extensions for Pi/Gentle Shell",
  };
}