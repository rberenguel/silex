import { state } from "./state.js";
import { loadAndIndexNotes, openFile, createNewFile } from "./files.js";
import { splitActivePane } from "../components/panes.js"; // <-- Import split function

const staticCommands = [
  {
    title: "New Note",
    aliases: ["create", "new"],
    lambda: createNewFile,
  },
  {
    title: "Split Vertically",
    aliases: ["splitv"],
    lambda: () => splitActivePane("vertical"),
  },
  {
    title: "Split Horizontally",
    aliases: ["splith"],
    lambda: () => splitActivePane("horizontal"),
  },
  {
    title: "Toggle Sidebar",
    aliases: ["ui", "sidebar"],
    lambda: () => document.getElementById("sidebar-toggle-btn").click(),
  },
  {
    title: "Re-index Notes",
    aliases: ["rescan", "refresh"],
    lambda: () => loadAndIndexNotes(state.notesDirectoryHandle),
  },
];

export function updatePaletteBindings() {
  metaP.maxCommands = 10;
  metaP.maxCommandTitleLength = 50;

  const fileCommands = state.allFilePaths.map((path) => ({
    title: path.replace(".md", "").split("/").pop(),
    lambda: () => openFile(path, state.activePane),
  }));

  metaP.bind(
    { command: staticCommands, file: fileCommands },
    { maxCommands: 10, blur: 1 },
  );
}

export function initializeCommands() {
  updatePaletteBindings();
}
