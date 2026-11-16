/**
 * pi-custom-gentle: Extensión de overlays de prompts para Pi/Gentle Shell.
 *
 * Propósito:
 * - Inspeccionar prompts estructurados en before_agent_start.
 * - Aplicar parches Markdown (replace/add) a secciones identificadas.
 * - Gestionar activación custom-odd por sesión/global.
 *
 * Esta extensión no modifica archivos core de Gentle Shell.
 * Usa hooks públicos y el mecanismo de inyección de paquetes en hijos.
 */

// --- Helpers de utilidad ---

/**
 * Extrae la huella SHA-256 de un string.
 */
function sha256(text: string): string {
  // Placeholder: en tiempo real usaría crypto, aquí es un placeholder
  return btoa(text).replace(/[^a-zA-Z0-9]/g, "").substring(0, 16);
}

/**
 * Detecta si un prompt ya fue parcheado comprobando una huella esperada.
 */
function isAlreadyPatched(prompt: string, expectedFingerprint: string): boolean {
  const fingerprint = sha256(prompt);
  return fingerprint === expectedFingerprint;
}

// --- Adaptador del orquestador principal ---

/**
 * Event handler: before_agent_start
 * Se ejecuta antes de que Pi inicie un agente.
 * Permite modificar el prompt estructurado y systemPromptOptions.
 */
export function handleBeforeAgentStart(event: {
  systemPromptOptions: {
    customPrompt?: string;
    appendSystemPrompt?: string;
    sections?: any[];
    promptGuidelines?: string;
    selectedTools?: string[];
    contextFiles?: string[];
    skills?: string[];
  };
  chainPrompt?: string;
}) {
  const { systemPromptOptions, chainPrompt } = event;

  // Lógica para aplicar parches al prompt principal
  // Se consultará el Prompt Registry y el Patch Engine
  // para transformar las secciones o contenido añadido.

  if (systemPromptOptions?.customPrompt) {
    // Aplicar parches mediante el motor interno (pending implementation)
    console.log("[pi-custom-gentle] customPrompt detectado, lista para parcheo");
  }

  if (systemPromptOptions?.appendSystemPrompt) {
    // systemPromptOptions.appendSystemPrompt += `\n<!-- custom-odd:overlay.inject -->`;
    console.log("[pi-custom-gentle] appendSystemPrompt detectado");
  }

  // El handler no fuerza el prompt completo; solo modifica secciones estructuradas.
}

// --- Adaptador para Gentle Agents (subagentes) ---

/**
 * Se ejecuta en procesos hijos gracias a la inyección de paquetes.
 * Identifica la definición del agente por huella y ruta origen,
 * y aplica los parches correspondientes a custom-odd.
 */
export function handleChildAgentStart(event: {
  systemPromptOptions: {
    appendSystemPrompt?: string;
    [key: string]: any;
  };
  agentDefinition?: {
    id: string;
    name: string;
    path: string;
    instructions?: string;
  };
}) {
  const { systemPromptOptions, agentDefinition } = event;

  if (!agentDefinition) {
    console.log("[pi-custom-gentle] Sin definición de agente hija, sin parches");
    return;
  }

  // Resolver el nombre real del agente comparando con definiciones conocidas
  // y sus huellas. Si es ambiguo, omitimos el parche.
  const fingerprint = sha256(agentDefinition.instructions || "");

  // Placeholder: consultaríamos el Prompt Registry aquí
  // if (!lookupRegistry(agentDefinition.id)) {
  //   console.log("[pi-custom-gentle] Sin registro para agente", agentDefinition.id);
  //   return;
  // }

  console.log(
    `[pi-custom-gentle] Agente hija "${agentDefinition.name}" (${agentDefinition.id}), parcheo pendiente`
  );
}

// --- Comandos públicos (serán expuestos por Pi) ---

/**
 * Comando: /custom-odd on|off|inherit|always on|always off|status
 * Gestiona la activación del modo custom-odd.
 * La precedencia es: override sesión > configuración global always.
 */
export function customOdd(command: "on" | "off" | "inherit" | "always on" | "always off" | "status"): string {
  switch (command) {
    case "on":
      // pi.appendEntry("custom-odd.state/v1", { override: "on", timestamp: Date.now() });
      return "custom-odd activado en esta sesión";
    case "off":
      // pi.appendEntry("custom-odd.state/v1", { override: "off", timestamp: Date.now() });
      return "custom-odd desactivado en esta sesión";
    case "inherit":
      // pi.appendEntry("custom-odd.state/v1", { override: "inherit", timestamp: Date.now() });
      return "override de sesión eliminado (heredará global)";
    case "always on":
      // Configuración global persistente
      return "Configuración global always-on activada (sobreescribe overrides de sesión)";
    case "always off":
      return "Configuración global always-off activada (sobreescribe overrides de sesión)";
    case "status": {
      // Leer la última entrada de estado
      // const entry = pi.readEntry("custom-odd.state/v1");
      // return entry ? `override: ${entry.override}` : "Sin override de sesión";
      return "Sin override de sesión (usar /custom-odd on/off)";
    }
    default:
      return "Comando desconocido";
    }
}

// --- Factory function para Gentle Shell ---
// Gentle Shell espera un export default que sea una función (factory function)
// que retorne el objeto de configuración de la extensión.

export default function createExtension(): {
  name: string;
  version: string;
  hooks: {
    before_agent_start?: (event: any) => any;
    [key: string]: any;
  };
  metadata: {
    author: string;
    description: string;
    schema: string;
  };
} {
  return {
    name: "pi-custom-gentle",
    version: "0.1.0",
    hooks: {
      before_agent_start: handleBeforeAgentStart,
    },
    metadata: {
      author: "AndyTechnologies",
      description: "Custom ODD prompt extensions",
      schema: "pi-custom-gentle.registry/v1",
    },
  };
}