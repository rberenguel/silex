import { createInitialPane } from "./components/panes.js";
import { initializeSidebar } from "./components/sidebar.js";
import { initializeCommands } from "./core/commands.js";
import { initializeFileHandling } from "./core/files.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Create the initial user interface (the first editor pane)
  createInitialPane();

  // 2. Set up event listeners for the sidebar
  initializeSidebar();

  // 3. Initialize the command palette with static commands
  initializeCommands();

  // 4. Initialize file system access via the VS Code API
  // This will fetch the initial file list and update the UI
  initializeFileHandling();
  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "split-vertical":
        splitActivePane("vertical");
        break;
      case "split-horizontal":
        splitActivePane("horizontal");
        break;
    }
  });
});
