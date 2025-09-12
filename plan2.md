# Refactoring Plan: Silex Multi-Platform App

**Objective:** Refactor the existing Silex VS Code extension into a multi-platform application that shares a single core codebase but can be deployed as a VS Code Extension, a Progressive Web App (PWA), and a Chrome Extension. This will enable a rapid, browser-based development workflow.

---

### Phase 1: Project Restructuring

1.  **Goal:** Create a clean directory structure that isolates platform-specific code from the shared application core.
2.  **Actions:**
    - Ensure all shared UI and application logic resides within the existing `/app` directory. This is the core of the project and should remain environment-agnostic.
    - Create a new top-level directory: `/pwa`.
    - Create another new top-level directory: `/chrome-extension`.

The final structure should look like this:

/silex
├── app/ # SHARED: Core application logic and UI
│ ├── components/
│ ├── core/
│ └── main.js
├── lib/ # SHARED: Libraries like CodeMirror
├── fonts/ # SHARED: Font assets
├── style.css # SHARED: Main stylesheet
|
├── extension.js # PLATFORM: VS Code entry point
├── main.html # PLATFORM: VS Code webview HTML
|
├── pwa/ # PLATFORM: PWA target
│ ├── index.html
│ ├── pwa-bridge.js
│ └── manifest.json
|
└── chrome-extension/ # PLATFORM: Chrome Extension target
├── index.html
├── chrome-bridge.js
├── background.js
└── manifest.json

---

### Phase 2: Create the PWA Target

1.  **Goal:** Build the PWA version for rapid, browser-based development using the File System Access API.

2.  **Actions:**

    - **Create `pwa/index.html`:** This is the PWA's entry point.
      ```html
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>Silex PWA</title>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <link rel="stylesheet" href="../lib/pico.min.css" />
          <link rel="stylesheet" href="../style.css" />
          <link rel="manifest" href="manifest.json" />
        </head>
        <body>
          <nav><button id="open-vault-btn">Open Vault</button></nav>
          <div id="app-container"></div>
          <script src="pwa-bridge.js"></script>
          <script type="module" src="../app/main.js"></script>
        </body>
      </html>
      ```
    - **Create `pwa/pwa-bridge.js`:** This script will mock the VS Code API and handle file system interactions.

      ```javascript
      let directoryHandle;
      let fileHandles = new Map();

      // 1. Mock the VS Code API for the core app to use
      const vscode = {
        postMessage: (message) => {
          if (message.command === "saveFile") {
            saveFile(message.file.name, message.file.content);
          }
          console.log("Message from App:", message);
        },
        getState: () => ({}),
        setState: (state) => console.log("Setting state:", state),
      };
      window.acquireVsCodeApi = () => vscode;

      // 2. File System Access Logic
      async function openVault() {
        try {
          directoryHandle = await window.showDirectoryPicker();
          const files = [];
          fileHandles.clear();
          for await (const entry of directoryHandle.values()) {
            if (entry.kind === "file" && entry.name.endsWith(".md")) {
              fileHandles.set(entry.name, entry);
              const file = await entry.getFile();
              const content = await file.text();
              files.push({ name: entry.name, content });
            }
          }
          // 3. Dispatch message to the core app, simulating VS Code
          window.dispatchEvent(
            new MessageEvent("message", {
              data: { command: "fileList", files },
            }),
          );
        } catch (e) {
          console.error("Error opening vault:", e);
        }
      }

      async function saveFile(fileName, content) {
        try {
          const handle = fileHandles.get(fileName);
          if (!handle) throw new Error(`File handle not found for ${fileName}`);
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          console.log(`${fileName} saved.`);
        } catch (e) {
          console.error("Error saving file:", e);
        }
      }

      // 4. Hook up the UI button
      window.addEventListener("DOMContentLoaded", () => {
        document
          .getElementById("open-vault-btn")
          .addEventListener("click", openVault);
        // The core app expects the main container to be #app
        const appContainer = document.getElementById("app-container");
        appContainer.id = "app";
      });
      ```

    - **Create `pwa/manifest.json`:** A basic manifest to make the app installable.
      ```json
      {
        "name": "Silex PWA",
        "short_name": "Silex",
        "start_url": "index.html",
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#000000"
      }
      ```

---

### Phase 3: Modify the Core App for Agnosticism

1.  **Goal:** Ensure the core `/app` code has no direct dependencies on any specific environment and can run anywhere an `acquireVsCodeApi` function is provided.
2.  **Actions:**
    - **Review `app/core/vscode-api.js`:** Ensure it solely relies on the globally available `acquireVsCodeApi()` function and does not contain any environment-specific logic. It should already be correct.
    - **Review `app/main.js`:** Ensure it attaches its UI to the `#app` element and does not create any platform-specific buttons. The PWA bridge script now handles the container renaming (`app-container` -> `app`), so no changes should be needed.

---

### Phase 4: Implement the Chrome Extension Target (Optional)

1.  **Goal:** Create the wrapper for the Chrome Extension.
2.  **Actions:**
    - **Create `chrome-extension/manifest.json`:**
      ```json
      {
        "manifest_version": 3,
        "name": "Silex Chrome",
        "version": "1.0",
        "action": {
          "default_title": "Open Silex",
          "default_popup": "index.html"
        },
        "permissions": ["storage"],
        "background": {
          "service_worker": "background.js"
        }
      }
      ```
    - **Create `chrome-extension/index.html`:** This can be almost identical to the PWA `index.html`, but it will load `chrome-bridge.js` instead of `pwa-bridge.js`.
    - **Create `chrome-extension/background.js` and `chrome-extension/chrome-bridge.js`:** These will use the `chrome.storage` and `chrome.fileSystem` (or an equivalent, as the API has changed) to manage file access, following a similar pattern to the PWA bridge. _(This is a more advanced step and can be deferred)._

---

### Phase 5: Development and Testing Workflow

1.  **Goal:** Establish a simple workflow for testing the PWA.
2.  **Actions:**
    - Install a simple local web server: `npm install -g http-server`.
    - From the project's root directory, run `http-server`.
    - Open your browser to `http://localhost:8080/pwa/` to run and test the PWA version. This provides access to developer tools, live reloading, etc., for 99% of the development work.
    - The VS Code extension can still be tested as before by running it in the Extension Development Host.
