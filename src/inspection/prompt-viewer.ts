/**
 * prompt-viewer.ts
 *
 * Prompt Viewer TUI con tres pestañas: Original, Resultante, Diff.
 * Utiliza componentes nativos de @earendil-works/pi-tui.
 * Presentación de snapshots completos con scroll y keybindings.
 */

import type { Snapshot } from "./prompt-inspector";

// Importaciones de componentes TUI nativas
import { Container, Text, ScrollView, DynamicBorder } from "@earendil-works/pi-tui";
import { KeybindingsManager } from "@earendil-works/pi-tui";

// Helper: contar líneas de un texto
function countLines(text: string): number {
  return text.split("\n").length;
}

// Helper: envolver texto al ancho dado (simple word wrap)
function wrapText(text: string, width: number): string[] {
  if (!text) return [""];
  const lines: string[] = [];
  const words = text.split(" ");
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine + (currentLine ? " " : "") + word;
    if (testLine.length <= width) {
      currentLine = testLine;
    } else {
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines;
}

// Helper: obtener líneas visibles starting desde startLine
function getVisibleLines(
  text: string,
  width: number,
  height: number,
  startLine: number
): string[] {
  const allLines = wrapText(text, width);
  const endLine = Math.min(startLine + height - 2, allLines.length);
  return allLines.slice(startLine, endLine);
}

// Tipo para configuración de pestaña
interface TabConfig {
  id: number;
  label: string;
  title: string;
  description: string;
  content: string;
}

// Estado del visor
interface ViewerState {
  activeTab: number;
  scrollPositions: Map<number, number>; // tabId -> scroll position
  terminalWidth: number;
  terminalHeight: number;
}

// Crear estado inicial
function createInitialState(
  snapshot: Snapshot,
  terminalWidth: number,
  terminalHeight: number
): ViewerState {
  return {
    activeTab: 0,
    scrollPositions: new Map([
      [0, 0],
      [1, 0],
      [2, 0],
    ]),
    terminalWidth,
    terminalHeight,
  };
}

// Configuración de las 3 pestañas
const TABS: TabConfig[] = [
  {
    id: 0,
    label: "Original",
    title: "Prompt recibido por Custom ODD antes de aplicar overlays",
    description: "",
    content: "", // Se poblará con el snapshot
  },
  {
    id: 1,
    label: "Resultante",
    title: "Prompt después de aplicar parches a Custom ODD",
    description: "",
    content: "", // Se poblará con el snapshot
  },
  {
    id: 2,
    label: "Diff",
    title: "Diferencias entre Original y Resultante",
    description: "",
    content: "", // Se poblará con el diff
  },
];

// Renderizar una pestaña específica
function renderTab(
  tab: TabConfig,
  state: ViewerState,
  snapshot: Snapshot
): string {
  const width = state.terminalWidth - 4;
  const height = state.terminalHeight - 6;

  // Obtener líneas visibles para esta pestaña
  const visibleLines = getVisibleLines(
    tab.content,
    width,
    height,
    state.scrollPositions.get(tab.id) || 0
  );

  // Construir contenido de la pestaña
  let content = "";

  // Header simplificado
  content += `╔${"=".repeat(width)}╗\n`;
  content += `║ ${tab.label.padEnd(width - 2)} ║\n`;
  content += `╠${"-".repeat(width)}╣\n`;
  content += `║ ${tab.title.padEnd(width - 2)} ║\n`;
  content += `║ ${tab.description.padEnd(width - 2)} ║\n`;
  content += `╠${"-".repeat(width)}╣\n`;

  // Contenido con scrolling
  content += `║${" ".repeat(width)}║\n`;

  // Mostrar líneas de contenido con números
  for (let i = 0; i < visibleLines.length; i++) {
    const lineNum = (state.scrollPositions.get(tab.id) || 0 + i + 1)
      .toString()
      .padStart(3);
    const lineContent = visibleLines[i];
    const paddingNeeded = width - 3 - lineContent.length;
    content += `║ ${lineNum}: ${lineContent}`;
    content += " ".repeat(paddingNeeded > 0 ? paddingNeeded : 0);
    content += " ║\n";
  }

  // Líneas vacías para llenar
  for (let i = visibleLines.length; i < height - 8; i++) {
    content += `║${" ".repeat(width)}║\n`;
  }

  content += `╚${"=".repeat(width)}╝\n`;

  return content;
}

// Renderizar el visor completo con border y footer
function renderViewer(
  state: ViewerState,
  tabs: TabConfig[],
  snapshot: Snapshot
): string {
  const width = state.terminalWidth - 4;
  const height = state.terminalHeight - 6;

  // Obtener contenido de la pestaña activa
  const activeTabContent = renderTab(
    tabs[state.activeTab],
    state,
    snapshot
  );

  // Indicador de pestaña activa
  const tabIndicator = ` ${state.activeTab + 1}/${tabs.length} `;

  // Footer con atajos
  const footer = `Controles: ←→ Cambiar pestaña (${tabIndicator}) | ↑↓ Desplazamiento | PgUp/PgDn Página | Home/End | Esc Cerrar`;

  return `${activeTabContent}\n${footer}\n`;
}

// Manejar entrada del teclado
function handleKeypress(
  key: string,
  state: ViewerState,
  tabs: TabConfig[],
  snapshot: Snapshot,
  done: () => void
): boolean {
  let changed = false;

  switch (key) {
    case "escape":
    case "q":
      done();
      return true;

    case "left":
    case "h":
      // Cambiar a pestaña anterior (wrap-around)
      state.activeTab = (state.activeTab - 1 + tabs.length) % tabs.length;
      state.scrollPositions.set(state.activeTab, 0);
      changed = true;
      break;

    case "right":
    case "l":
      // Cambiar a pestaña siguiente (wrap-around)
      state.activeTab = (state.activeTab + 1) % tabs.length;
      state.scrollPositions.set(state.activeTab, 0);
      changed = true;
      break;

    case "up":
    case "k":
      // Desplazarse hacia arriba en la pestaña actual
      const currentScroll = state.scrollPositions.get(state.activeTab) || 0;
      if (currentScroll > 0) {
        state.scrollPositions.set(state.activeTab, currentScroll - 1);
        changed = true;
      }
      break;

    case "down":
    case "j":
      // Desplazarse hacia abajo en la pestaña actual
      const maxScroll = Math.max(
        0,
        (snapshot.originalPrompt?.split("\n").length || 0) -
          (state.terminalHeight || 8) + 2
      );
      const currentScroll = state.scrollPositions.get(state.activeTab) || 0;
      if (currentScroll < maxScroll) {
        state.scrollPositions.set(state.activeTab, currentScroll + 1);
        changed = true;
      }
      break;

    case "pageup":
    case "b":
      // Página arriba
      state.scrollPositions.set(
        state.activeTab,
        Math.max(0, (state.scrollPositions.get(state.activeTab) || 0) - (state.terminalHeight || 8) + 2)
      );
      changed = true;
      break;

    case "pagedown":
    case "f":
      // Página abajo
      state.scrollPositions.set(
        state.activeTab,
        Math.min(
          // scroll max calculado basado en contenido
          9999,
          (state.scrollPositions.get(state.activeTab) || 0) + (state.terminalHeight || 8) - 2
        )
      );
      changed = true;
      break;

    case "home":
      // Inicio
      state.scrollPositions.set(state.activeTab, 0);
      changed = true;
      break;

    case "end":
      // Final
      const endScroll = Math.max(
        0,
        (snapshot.originalPrompt?.split("\n").length || 0) -
          (state.terminalHeight || 8) + 2
      );
      state.scrollPositions.set(state.activeTab, endScroll);
      changed = true;
      break;

    default:
      // Cualquier otra tecla, ignorar
      break;
  }

  return changed;
}

// Componente principal del Prompt Viewer TUI
export async function promptViewerTUI(
  snapshot: Snapshot,
  ctx: any
): Promise<void> {
  // Determinar dimensiones del terminal
  const terminalWidth =
    ctx.ui.getTerminalDimensions?.()?.width || 80;
  const terminalHeight =
    ctx.ui.getTerminalDimensions?.()?.height || 25;

  // Configurar contenido de pestañas con datos reales del snapshot
  const tabs: TabConfig[] = [
    {
      id: 0,
      label: "Original",
      title: `Prompt recibido por ${snapshot.agentId || "orchestrator"} antes de aplicar overlays`,
      description: `${snapshot.originalPrompt.length} caracteres, ${countLines(snapshot.originalPrompt)} líneas`,
      content: snapshot.originalPrompt,
    },
    {
      id: 1,
      label: "Resultante",
      title: `Prompt después de aplicar parches a ${snapshot.agentId || "orchestrator"}`,
      description: `${snapshot.transformedPrompt.length} caracteres, ${countLines(snapshot.transformedPrompt)} líneas`,
      content: snapshot.transformedPrompt,
    },
    {
      id: 2,
      label: "Diff",
      title: `Diferencias entre Original y Resultante`,
      description: snapshot.diff
        ? `${snapshot.diff.split("\n").length} líneas de diff`
        : "Sin diferencias",
      content: snapshot.diff || "No hay diff disponible",
    },
  ];

  // Crear estado inicial
  const state = createInitialState(snapshot, terminalWidth, terminalHeight);

  // Renderizar inicial
  let lastRender = renderViewer(state, tabs, snapshot);

  // Intentar usar ctx.ui.custom si está disponible
  if (ctx.ui?.custom) {
    try {
      await ctx.ui.custom(
        (tui, theme, keybindings, done) => {
          // Escribir visor inicial
          tui.write(lastRender);

          // Manejar entrada del teclado
          return async (input: any) => {
            const key = input?.key || input?.name;

            // Procesar tecla
            const changed = handleKeypress(
              key,
              state,
              tabs,
              snapshot,
              done
            );

            if (!changed) {
              // Intentar cerrar si no hay cambio
              done?.();
              return;
            }

            // Re-renderizar
            lastRender = renderViewer(state, tabs, snapshot);
            tui.write(lastRender);
          };
        },
        {
          blocked: {
            kind: "question",
            message: `Prompt Inspector - Agente: ${snapshot.agentId || "orchestrator"}`,
          },
        }
      );
    } catch (error) {
      // Fallback si ctx.ui.custom falla
      console.error("Prompt Viewer TUI error:", error);
      fallbackToNotifications(snapshot, ctx);
    }
  } else {
    // Fallback a notificaciones
    fallbackToNotifications(snapshot, ctx);
  }
}

// Mostrar en notificaciones si TUI no está disponible
function fallbackToNotifications(snapshot: Snapshot, ctx: any): void {
  ctx.ui.notify(`=== PROMPT ORIGINAL (${snapshot.originalPrompt.length} chars) ===`, "info");
  ctx.ui.notify(
    snapshot.originalPrompt.substring(0, 300) +
      (snapshot.originalPrompt.length > 300 ? "..." : ""),
    "info"
  );

  ctx.ui.notify(`=== PROMPT TRANSFORMADO (${snapshot.transformedPrompt.length} chars) ===`, "info");
  ctx.ui.notify(
    snapshot.transformedPrompt.substring(0, 300) +
      (snapshot.transformedPrompt.length > 300 ? "..." : ""),
    "info"
  );

  ctx.ui.notify(`=== DIFF (${(snapshot.diff?.split("\n").length || 0)} líneas) ===`, "info");
  ctx.ui.notify(
    (snapshot.diff || "Sin diff").substring(0, 300) +
      ((snapshot.diff || "").length > 300 ? "..." : ""),
    "info"
  );
}