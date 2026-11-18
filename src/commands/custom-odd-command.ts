/**
 * custom-odd-command.ts
 *
 * Manejo de comandos /custom-odd: on, off, inherit, always on, always off, status.
 * Estado, precedencia y persistencia mediante la API real de Pi.
 */

// Importaciones internas
import { customOdd, getState, propagateToChild } from "../state/state-manager";

// Opciones para autocompletado
const CUSTOM_ODD_OPTIONS = [
  "on",
  "off",
  "inherit",
  "always on",
  "always off",
  "status",
];

/**
 * Obtener completado para /custom-odd
 */
export function getCustomOddCompletions(prefix: string): Array<{ value: string; label: string }> | null {
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

/**
 * Ejecutar comando /custom-odd on
 */
export function executeCustomOddOn(ctx: any): CustomOddState {
  // Activar estado de sesión
  const state = customOdd("on" as const);

  ctx.ui.notify(
    `custom-odd activado en esta sesión (effective: ${state.effective}, source: ${state.source})`,
    "info"
  );

  return state;
}

/**
 * Ejecutar comando /custom-odd off
 */
export function executeCustomOddOff(ctx: any): CustomOddState {
  // Desactivar estado de sesión
  const state = customOdd("off" as const);

  ctx.ui.notify(
    `custom-odd desactivado en esta sesión (effective: ${state.effective})`,
    "info"
  );

  return state;
}

/**
 * Ejecutar comando /custom-odd inherit
 */
export function executeCustomOddInherit(ctx: any): CustomOddState {
  // Heredar configuración global
  const state = customOdd("inherit" as const);

  ctx.ui.notify(
    `custom-odd heredará configuración global (effective: ${state.effective}, source: ${state.source})`,
    "info"
  );

  return state;
}

/**
 * Ejecutar comando /custom-odd always on
 */
export function executeCustomOddAlwaysOn(ctx: any): CustomOddState {
  // Configuración global persistente
  // En producción: guardar en pi.appendEntry con tipo global
  const state = customOdd("always on" as const);

  ctx.ui.notify(
    `Configuración global always-on activada (effective: ${state.effective}, source: ${state.source})`,
    "info"
  );

  return state;
}

/**
 * Ejecutar comando /custom-odd always off
 */
export function executeCustomOddAlwaysOff(ctx: any): CustomOddState {
  // Configuración global persistente
  const state = customOdd("always off" as const);

  ctx.ui.notify(
    `Configuración global always-off activada (effective: ${state.effective}, source: ${state.source})`,
    "info"
  );

  return state;
}

/**
 * Ejecutar comando /custom-odd status
 */
export function executeCustomOddStatus(ctx: any): CustomOddState {
  // Retornar estado efectivo sin modificar
  const state = getState();

  const statusMessage: Record<CustomOddMode, string> = {
    on: `custom-odd activado (session override: on)`,
    off: `custom-odd desactivado (sin override)`,
    inherit: `custom-odd heredando configuración global`,
    "always-on": `custom-odd configuración global always-on`,
    "always-off": `custom-odd configuración global always-off`,
    none: `custom-odd default (off)`,
  };

  // Determinar la clave adecuada
  const modeKey = state.effective === "on"
    ? "on"
    : state.effective === "off"
     ? "off"
     : state.effective;

  const message = statusMessage[mode as CustomOddMode] || `custom-odd estado: ${state.effective}`;
  ctx.ui.notify(message, "info");

  return state;
}

// Tipo para modo custom-odd
export type CustomOddMode = "on" | "off" | "inherit" | "always-on" | "always-off" | "none";

/**
 * Ejecutar comando /custom-odd con handler completo
 */
export function registerCustomOddCommand(pi: any) {
  pi.registerCommand("custom-odd", {
    description:
      "Manage custom ODD mode (on/off/inherit/always on/always off/status)",

    getArgumentCompletions: (prefix: string) => {
      return getCustomOddCompletions(prefix);
    },

    handler: async (args: string, ctx: any) => {
      const command = args.trim().toLowerCase();

      try {
        switch (command) {
          case "on": {
            const state = executeCustomOddOn(ctx);
            return;
          }
          case "off": {
            const state = executeCustomOddOff(ctx);
            return;
          }
          case "inherit": {
            const state = executeCustomOddInherit(ctx);
            return;
          }
          case "always on": {
            const state = executeCustomOddAlwaysOn(ctx);
            return;
          }
          case "always off": {
            const state = executeCustomOddAlwaysOff(ctx);
            return;
          }
          case "status": {
            const state = executeCustomOddStatus(ctx);
            return;
          }
          default: {
            ctx.ui.notify(
              `Comando desconocido. Use: ${CUSTOM_ODD_OPTIONS.join(
                "/"
              )}`,
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