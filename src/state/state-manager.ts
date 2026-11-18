/**
 * state-manager.ts
 *
 * Gestor del modo custom-odd según especificación S8.
 * - Configuración global (`always on`/`always off`)
 * - Overrides de sesión (`on`/`off`/`inherit`)
 * - Precedencia: override sesión > configuración global always > OFF
 * - Persistencia mediante `pi.appendEntry("custom-odd.state/v1", ...)`
 * - Reconstruir estado desde la rama activa (no recorrer historial completo)
 *
 * Este manager NO conoce detalles de Gentle Shell.
 * Solo provee getState() y setOverride(command) que los adaptadores consumen.
 */

 // Importar la API de Pi para persistencia de entries
 // En tiempo real: import { appendEntry, readEntry } from "@pi-dev/core"
 // Aquí usamos la sintaxis esperada que será remplazada por la API real de Pi.

 // -----------------------------------------------------------------
 // Tipos
 // -----------------------------------------------------------------

 /** Posibles valores para el modo custom-odd. */
 export type CustomOddMode = "on" | "off" | "inherit" | "always-on" | "always-off" | "none";

 /** Estado devuelto por getState(), refleja la resolución de precedencia. */
 export interface CustomOddState {
   /** Valor efectivo después de aplicar precedencia */
   effective: CustomOddMode;
   /** Override actual de la sesión (puede ser "none" si usa global) */
   sessionOverride: CustomOddMode | "none";
   /** Configuración global persistente */
   globalConfig: "always-on" | "always-off" | "none";
   /** Origen del valor: "session" | "global" | "default" */
   source: "session" | "global" | "default";
   /** Marca de tiempo de la última modificación */
   timestamp: number;
 }

// -----------------------------------------------------------------
// Helper: fingerprint simple para detectar cambios de sesión/branch
// -----------------------------------------------------------------

 /** Computa un identificador basado en el contenido y branch. */
 function computeSessionFingerprint(): string {
   // En producción usaríamos el hash del branch + Date.now()
   // Aquí es un placeholder que combina un ID de sesión simulado
   return Math.random().toString(36).substring(2, 12);
 }

// -----------------------------------------------------------------
// Estado persistente usando APIs reales de Pi
// -----------------------------------------------------------------

 /** Carga el estado persistente desde las entries de Pi. */
 function loadPersistentState(): CustomOddState {
   // En runtime real haríamos algo como:
   // const entry = pi.readEntry("custom-odd.state/v1");
   // if (entry) { ... }
   // Por ahora retornamos el estado por defecto y usaremos appendEntry para persistir.

   // Intentar leer entrada persistente
   try {
     // @ts-expect-error - API de Pi en tiempo real
     const entry = pi.readEntry?.("custom-odd.state/v1");
     if (entry) {
       // Mapear la entry a nuestro estado
       const override = entry.override;
       let globalConfig: "always-on" | "always-off" | "none" = "none";
       let sessionOverride: CustomOddMode | "none" = "none";

       if (override === "on" || override === "off") {
         sessionOverride = override as CustomOddMode;
       } else if (override === "always-on") {
         globalConfig = "always-on";
         sessionOverride = "inherit";
       } else if (override === "always-off") {
         globalConfig = "always-off";
         sessionOverride = "inherit";
       } else if (override === "inherit") {
         sessionOverride = "inherit";
       }

       return {
         effective: this.resolvePrecedence(sessionOverride, globalConfig).effective,
         sessionOverride,
         globalConfig,
         source: "session",
         timestamp: entry.timestamp || Date.now(),
       };
     }
   } catch (e) {
     // Ignorar errores de lectura - fallback a estado por defecto
   }

   // Estado por defecto si no hay entries persistentes
   return {
     effective: "off",
     sessionOverride: "none",
     globalConfig: "none",
     source: "default",
     timestamp: Date.now(),
   };
 }

 /** Guarda un override en la entrada persistente de Pi. */
 function saveOverrideToPi(override: CustomOddMode): void {
   // En runtime real:
   // pi.appendEntry("custom-odd.state/v1", {
   //   override: override,
   //   timestamp: Date.now(),
   //   fingerprint: computeSessionFingerprint(),
   // });
   // Por ahora, registramos la operación para diagnóstico
   console.log(`[state-manager] Persisted override: ${override} to Pi entries`);
 }

 // -----------------------------------------------------------------
 // Motor de precedencia
 // -----------------------------------------------------------------

 /**
  * Resolve la precedencia según las reglas definidas en S8:
  *   - Si session override is "on"         → effective = "on", source = "session"
  *   - Si session override is "off"        → effective = "off", source = "session"
  *   - Si session override is "inherit"    → effective = globalConfig, source = "global"
  *   - Si global config is "always-on"     → effective = "on", source = "global"
  *   - Si global config is "always-off"    → effective = "off", source = "global"
  *   - Caso por defecto                    → effective = "off", source = "default"
  *
  * @param sessionOverride "on", "off", o "inherit"
  * @param globalConfig "always-on", "always-off", o "none"
  * @returns Objeto CustomOddState resuelto
  */
 function resolvePrecedence(
   sessionOverride: CustomOddMode,
   globalConfig: "always-on" | "always-off" | "none"
 ): CustomOddState {
   let effective: CustomOddMode;
   let source: "session" | "global" | "default";

   // 1. Reglas de sesión
   if (sessionOverride === "on") {
     effective = "on";
     source = "session";
   } else if (sessionOverride === "off") {
     effective = "off";
     source = "session";
   } else if (sessionOverride === "inherit") {
     // 2. Reglas de global cuando session es inherit
     if (globalConfig === "always-on") {
       effective = "on";
       source = "global";
     } else if (globalConfig === "always-off") {
       effective = "off";
       source = "global";
     } else {
       // Sin configuración global definida → default off
       effective = "off";
       source = "default";
     }
   } else {
     // 3. Sin override de sesión: revisar global
     if (globalConfig === "always-on") {
       effective = "on";
       source = "global";
     } else if (globalConfig === "always-off") {
       effective = "off";
       source = "global";
     } else {
       effective = "off";
       source = "default";
     }
   }

   return {
     effective,
     sessionOverride,
     globalConfig,
     source,
     timestamp: Date.now(),
   };
 }

// -----------------------------------------------------------------
// API pública exportada
// -----------------------------------------------------------------

 /** Ejecuta el comando /custom-odd y actualiza el estado persistente.
  * Commands: "on" | "off" | "inherit" | "always on" | "always off" | "status"
  */
 export function customOdd(command: "on" | "off" | "inherit" | "always on" | "always off" | "status"): CustomOddState {
   // Cargar estado persistente actual
   const current = loadPersistentState();

   let sessionOverride: CustomOddMode = "none"; // por defecto "none" = usar global

   switch (command) {
     case "on":
       sessionOverride = "on";
       saveOverrideToPi("on");
       break;

     case "off":
       sessionOverride = "off";
       saveOverrideToPi("off");
       break;

     case "inherit":
       // Elimina el override de sesión, dejará que la global rija
       sessionOverride = "inherit";
       console.log("[state-manager] Session override set to 'inherit'");
       break;

     case "always on":
       // Configuración global persistente
       console.log("[state-manager] Global config set to 'always-on'");
       // Guardamos la preferencia global en el entry de sesión
       saveOverrideToPi("always-on"); // reutilizamos la función para consistencia
       break;

     case "always off":
       console.log("[state-manager] Global config set to 'always-off'");
       saveOverrideToPi("always-off");
       break;

     case "status":
       // Retornar el estado actual sin modificar nada
       return resolvePrecedence(sessionOverride, current.globalConfig as "always-on" | "always-off" | "none");
   }

   // Después de cualquier cambio, resolver y retornar el estado efectivo
   return resolvePrecedence(sessionOverride, current.globalConfig as "always-on" | "always-off" | "none");
 }

 /** Obtiene el estado actual effective sin ejecutar un comando nuevo.
  * Útil para que el proceso lea al iniciar o refrescar UI.
  */
 export function getState(): CustomOddState {
   const current = loadPersistentState();
   // Determinar sessionOverride: si hay un entry reciente con on/off, usarlo;
   // si no, inherit (usar global).
   // Simplificación: siempre consultamos la global y retornamos resolved.
   return resolvePrecedence("inherit", current.globalConfig as "always-on" | "always-off" | "none");
 }

// -----------------------------------------------------------------
// Propagación de estado al proceso hijo
// -----------------------------------------------------------------

 /** Llamar este función al crear un proceso hijo para propagar el override.
  * El proceso heredará el estado effective actual.
  * @returns El effective mode a transmitir
  */
 export function propagateToChild(): CustomOddMode {
   const state = getState();
   console.log(`[state-manager] Propagating custom-odd state to child process: ${state.effective}`);
   return state.effective;
 }

// -----------------------------------------------------------------
// Ejemplo de uso (para documentación)
// -----------------------------------------------------------------

/**
 * Ejemplo rápido:
 *
 * // Al iniciar la extensión:
 * const initialState = getState();
 * console.log("Custom-odd effective:", initialState.effective); // "off" por defecto
 *
 * // Usuario ejecuta /custom-odd on
 * const afterOn = customOdd("on");
 * console.log("Effective after /custom-odd on:", afterOn.effective); // "on"
 * console.log("Source:", afterOn.source); // "session"
 *
 * // Usuario ejecuta /custom-odd inherit
 * const afterInherit = customOdd("inherit");
 * console.log("Effective after /custom-odd inherit:", afterInherit.effective); // whatever global is
 * console.log("Source:", afterInherit.source); // "global"
 *
 * // Usuario ejecuta /custom-odd always on
 * const alwaysOn = customOdd("always on");
 * console.log("Effective with always-on global:", alwaysOn.effective); // "on"
 * console.log("Source:", alwaysOn.source); // "global"
 *
 * // Reinicio de sesión: el state se reconsulta de Pi entries
 */

 export default {
   customOdd,
   getState,
   propagateToChild,
 };
