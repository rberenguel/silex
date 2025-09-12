let directoryHandle;
let fileHandles = new Map();
let initialFilesRequest = null;

// 1. Mock the VS Code API
const vscode = {
  postMessage: (message) => {
    console.log("Message from App:", message);
    switch (message.type) {
      case "getInitialFiles":
        initialFilesRequest = { requestId: message.requestId };
        break;
      case "writeFile":
        saveFile(message.payload.path, message.payload.content);
        break;
      case "readFile":
        readFileAndRespond(message.payload.path, message.requestId);
        break;
    }
  },
  getState: () => ({}),
  setState: (state) => console.log("Setting state:", state),
};
window.acquireVsCodeApi = () => vscode;

// 2. NEW: Recursive File System Traversal
async function getFilesRecursively(dirHandle, path = "") {
  const files = [];
  for await (const entry of dirHandle.values()) {
    if (entry.name.startsWith(".")) {
      continue; // Skip hidden files and folders
    }
    const entryPath = path ? `${path}/${entry.name}` : entry.name;
    if (entry.kind === "file" && entry.name.endsWith(".md")) {
      fileHandles.set(entryPath, entry);
      files.push(entryPath);
    } else if (entry.kind === "directory") {
      const subFiles = await getFilesRecursively(entry, entryPath);
      files.push(...subFiles);
    }
  }
  return files;
}

// 3. Updated File System Access Logic
async function openVault() {
  if (!initialFilesRequest) {
    console.warn(
      "Open Vault clicked, but the app hasn't requested the file list yet.",
    );
    return;
  }

  try {
    directoryHandle = await window.showDirectoryPicker();
    fileHandles.clear();

    // Use the new recursive function
    const files = await getFilesRecursively(directoryHandle);

    // Dispatch the response the app is waiting for
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          requestId: initialFilesRequest.requestId,
          payload: files,
        },
      }),
    );
    initialFilesRequest = null;
  } catch (e) {
    console.error("Error opening vault:", e);
  }
}

async function readFileAndRespond(filePath, requestId) {
  try {
    const handle = fileHandles.get(filePath);
    if (!handle) throw new Error(`File handle not found for ${filePath}`);
    const file = await handle.getFile();
    const content = await file.text();

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { requestId: requestId, payload: content },
      }),
    );
  } catch (e) {
    console.error("Error reading file:", e);
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { requestId: requestId, error: e.message },
      }),
    );
  }
}

async function saveFile(filePath, content) {
  try {
    // To save, we need to get the handle again, which might involve traversing
    let currentHandle = directoryHandle;
    const parts = filePath.split("/");
    const fileName = parts.pop();

    for (const part of parts) {
      currentHandle = await currentHandle.getDirectoryHandle(part);
    }

    const fileHandle = await currentHandle.getFileHandle(fileName, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    console.log(`${filePath} saved.`);
  } catch (e) {
    console.error("Error saving file:", e);
  }
}

// 4. Hook up the UI button
window.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("open-vault-btn")
    .addEventListener("click", openVault);
});
