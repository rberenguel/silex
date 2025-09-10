import { createInitialPane } from "./components/panes.js";
import { initializeSidebar } from "./components/sidebar.js";
import { initializeCommands } from "./core/commands.js";
import { initializeFileHandling } from "./core/files.js";
import { initializeLeaderKey } from "./extensions/leader-key.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Create the initial user interface (the first editor pane)
  createInitialPane();

  // 2. Set up event listeners for the sidebar
  initializeSidebar();

  // 3. Initialize the command palette
  initializeCommands();

  // 4. Set up the leader key for splitting panes
  initializeLeaderKey();

  // 5. Initialize file system access and load the last-used folder
  // This is last as it might trigger loading files into the UI
  initializeFileHandling();
});
