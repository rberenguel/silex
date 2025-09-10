const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function activate(context) {
  // Get the root path of the currently open workspace
  const rootPath =
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
      ? vscode.workspace.workspaceFolders[0].uri
      : undefined;

  // We are creating a command that will instantiate the panel.
  context.subscriptions.push(
    vscode.commands.registerCommand("silex.openVault", () => {
      if (!rootPath) {
        vscode.window.showInformationMessage(
          "Please open a folder to use Silex.",
        );
        return;
      }
      // Pass the rootPath to the panel when creating it
      SilexPanel.createOrShow(context.extensionUri, rootPath);
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("silex.splitVertical", () => {
      if (SilexPanel.currentPanel) {
        SilexPanel.currentPanel.sendMessageToWebview({
          type: "split-vertical",
        });
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("silex.splitHorizontal", () => {
      if (SilexPanel.currentPanel) {
        SilexPanel.currentPanel.sendMessageToWebview({
          type: "split-horizontal",
        });
      }
    }),
  );
  // This part is for the sidebar tree view, it seems correct.
  if (rootPath) {
    vscode.window.createTreeView("silexSidebarView", {
      treeDataProvider: new VaultDataProvider(rootPath.fsPath),
    });
  }
}

class SilexPanel {
  static currentPanel = undefined;
  static viewType = "silex";

  static createOrShow(extensionUri, workspaceRoot) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (SilexPanel.currentPanel) {
      SilexPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      SilexPanel.viewType,
      "Silex",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "")],
      },
    );

    SilexPanel.currentPanel = new SilexPanel(
      panel,
      extensionUri,
      workspaceRoot,
    );
  }
  sendMessageToWebview(message) {
    this._panel.webview.postMessage(message);
  }
  constructor(panel, extensionUri, workspaceRoot) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._disposables = [];
    this.workspaceRoot = workspaceRoot; // Store the workspace root URI

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        const { type, requestId, payload } = message;
        let response = {};
        try {
          switch (type) {
            case "getInitialFiles":
              response.payload = await this.getInitialFiles();
              break;
            case "readFile":
              response.payload = await this.readFile(payload.path);
              break;
            case "writeFile":
              await this.writeFile(payload.path, payload.content);
              response.payload = { success: true };
              break;
            case "createNewFile":
              await this.createNewFile(payload.path);
              response.payload = { success: true };
              break;
            case "renameFile":
              await this.renameFile(payload.oldPath, payload.newPath);
              response.payload = { success: true };
              break;
          }
        } catch (err) {
          console.error("Error in Silex backend:", err);
          response.error = err.message;
        }
        this._panel.webview.postMessage({ ...response, requestId });
      },
      null,
      this._disposables,
    );
  }

  // --- Unified Filesystem Methods ---

  async getInitialFiles() {
    if (!this.workspaceRoot) return [];
    const files = await vscode.workspace.findFiles("**/*.md");
    return files.map((file) =>
      path.relative(this.workspaceRoot.fsPath, file.fsPath),
    );
  }

  async readFile(filePath) {
    if (!this.workspaceRoot) throw new Error("Workspace not open");
    const fileUri = vscode.Uri.joinPath(this.workspaceRoot, filePath);
    const content = await vscode.workspace.fs.readFile(fileUri);
    return new TextDecoder().decode(content);
  }

  async writeFile(filePath, content) {
    if (!this.workspaceRoot) throw new Error("Workspace not open");
    const fileUri = vscode.Uri.joinPath(this.workspaceRoot, filePath);
    // Use TextEncoder to get a Uint8Array, which is the required format.
    await vscode.workspace.fs.writeFile(
      fileUri,
      new TextEncoder().encode(content),
    );
    console.log("Wrote file:", fileUri.fsPath); // For debugging
  }

  async createNewFile(filePath) {
    if (!this.workspaceRoot) throw new Error("Workspace not open");
    const fileUri = vscode.Uri.joinPath(this.workspaceRoot, filePath);
    await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
  }

  async renameFile(oldFilePath, newFilePath) {
    if (!this.workspaceRoot) throw new Error("Workspace not open");
    const oldUri = vscode.Uri.joinPath(this.workspaceRoot, oldFilePath);
    const newUri = vscode.Uri.joinPath(this.workspaceRoot, newFilePath);
    await vscode.workspace.fs.rename(oldUri, newUri);
  }

  // --- Webview HTML and Update Logic ---

  _update() {
    const webview = this._panel.webview;
    this._panel.title = "Silex";
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  _getHtmlForWebview(webview) {
    const mainHtmlPath = vscode.Uri.joinPath(this._extensionUri, "main.html");
    let mainHtml = fs.readFileSync(mainHtmlPath.fsPath, "utf8");

    const toWebviewUri = (filePathParts) => {
      const diskUri = vscode.Uri.joinPath(this._extensionUri, ...filePathParts);
      return webview.asWebviewUri(diskUri).toString();
    };

    // Replace all placeholders with secure webview URIs
    mainHtml = mainHtml.replace(
      /SILEX_PICO_CSS/g,
      toWebviewUri(["lib", "pico.min.css"]),
    );
    mainHtml = mainHtml.replace(
      /SILEX_VICTORMONO_CSS/g,
      toWebviewUri(["fonts", "victormono.css"]),
    );
    mainHtml = mainHtml.replace(
      /SILEX_METAP_CSS/g,
      toWebviewUri(["lib", "metap", "metap.css"]),
    );
    mainHtml = mainHtml.replace(
      /SILEX_STYLE_CSS/g,
      toWebviewUri(["style.css"]),
    );
    mainHtml = mainHtml.replace(
      /SILEX_METAP_JS/g,
      toWebviewUri(["lib", "metap", "metap.js"]),
    );
    mainHtml = mainHtml.replace(
      /SILEX_CODEMIRROR_BUNDLE_JS/g,
      toWebviewUri(["lib", "codemirror-bundle.js"]),
    );
    mainHtml = mainHtml.replace(
      /SILEX_VSCODE_API_JS/g,
      toWebviewUri(["vscode-api.js"]),
    );
    mainHtml = mainHtml.replace(
      /SILEX_MAIN_JS/g,
      toWebviewUri(["app", "main.js"]),
    );

    return mainHtml;
  }

  dispose() {
    SilexPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}

// This class seems to be for a separate Tree View in the sidebar.
// It looks correct and doesn't need changes.
class VaultDataProvider {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }

  getTreeItem(element) {
    return element;
  }

  async getChildren(element) {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage("No vault open in empty workspace");
      return Promise.resolve([]);
    }

    const files = await vscode.workspace.findFiles("**/*.md");
    return files.map((file) => {
      const relativePath = path.relative(this.workspaceRoot, file.fsPath);
      return new vscode.TreeItem(
        relativePath,
        vscode.TreeItemCollapsibleState.None,
      );
    });
  }
}

module.exports = {
  activate,
};
