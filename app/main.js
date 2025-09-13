import { createApp } from "./core/app.js";
import { initializeSidebar } from "./components/sidebar.js";
import extensionDirectories from "./extensions.js";
import { initializeCommands } from "./core/commands.js";

async function loadExtensions(app) {
  for (const path of extensionDirectories) {
    try {
      // 1. Fetch the manifest for the extension
      const manifestResponse = await fetch(`${path}/manifest.json`);
      const manifest = await manifestResponse.json();
      console.log(manifest);
      // 2. Check for a stylesheet and inject it if it exists
      if (manifest.style) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `${path}/${manifest.style}`;
        document.head.appendChild(link);
      }

      // 3. Load the main JavaScript module
      if (manifest.main) {
        const module = await import(`${path}/${manifest.main}`);
        if (module.activate) {
          module.activate(app);
        }
      }
    } catch (e) {
      console.error(`Failed to load extension from ${path}:`, e);
    }
  }
}

// The rest of your main.js file remains the same...
document.addEventListener("DOMContentLoaded", async () => {
  const app = createApp();
  window.app = app;

  // --- NEW: Initialize the main layout resizer ---
  const contentWrapper = document.getElementById("content-wrapper");
  // Initial sizes: sidebar=250px, gutter=8px, main-content=1fr (fills rest)
  contentWrapper.style.gridTemplateColumns = "250px 8px 1fr";

  Split({
    columnGutters: [
      {
        track: 1, // The gutter is at track 1 (0=sidebar, 1=gutter, 2=main)
        element: document.getElementById("main-gutter"),
      },
    ],
  });
  // ---------------------------------------------
  initializeSidebar();
  initializeCommands(app);

  await loadExtensions(app);
  app.ui.createInitialPane();
  await app.workspace.initializeFileHandling();
});
