import { state } from "./state.js";
import { loadSidebarList } from "../components/sidebar.js";
import { updatePaletteBindings } from "./commands.js";
import { MiniSearch } from "../../lib/codemirror-bundle.js";

const openFolderBtn = document.getElementById("open-folder-btn");
const currentFileTitle = document.getElementById("current-file-title");

// --- IndexedDB Helper to store the directory handle ---
const idb = {
  db: null,
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("SilexFileHandles", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("handles");
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = (e) => {
        console.error("IndexedDB error:", e);
        reject(e);
      };
    });
  },
  async get(key) {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve(undefined);
        return;
      }
      const tx = this.db.transaction("handles", "readonly");
      const request = tx.objectStore("handles").get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
    });
  },
  async set(key, value) {
    if (!this.db) return;
    const tx = this.db.transaction("handles", "readwrite");
    tx.objectStore("handles").put(value, key);
    return tx.done;
  },
};

async function getFileHandleRecursive(dirHandle, path) {
  const parts = path.split("/");
  let currentHandle = dirHandle;
  for (let i = 0; i < parts.length - 1; i++) {
    currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
  }
  return await currentHandle.getFileHandle(parts[parts.length - 1]);
}

async function buildFileTree(dirHandle, currentPath = "") {
  const items = [];
  for await (const entry of dirHandle.values()) {
    if (entry.name.startsWith(".")) continue;

    const newPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    if (entry.kind === "directory") {
      items.push({
        type: "folder",
        name: entry.name,
        children: await buildFileTree(entry, newPath),
      });
    } else if (entry.kind === "file" && entry.name.endsWith(".md")) {
      items.push({
        type: "file",
        name: entry.name.replace(".md", ""),
        path: newPath,
      });
    }
  }
  items.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "folder" ? -1 : 1;
  });
  return items;
}

export async function loadAndIndexNotes(dirHandle) {
  if (!dirHandle) return;

  const flattenTree = (nodes) => {
    let flat = [];
    for (const node of nodes) {
      if (node.type === "file") {
        flat.push({ id: node.path, name: node.path.replace(".md", "") });
      } else if (node.type === "folder" && node.children) {
        flat = flat.concat(flattenTree(node.children));
      }
    }
    return flat;
  };

  const fileTree = await buildFileTree(dirHandle);
  loadSidebarList(fileTree);

  const documents = flattenTree(fileTree);
  state.allFilePaths = documents.map((doc) => doc.id);

  state.fileSearchIndex = new MiniSearch({
    fields: ["name"],
    storeFields: ["name"],
    extractField: (doc, fieldName) => doc[fieldName],
  });
  state.fileSearchIndex.addAll(documents);

  updatePaletteBindings();
}

export async function createNewFile() {
  if (!state.notesDirectoryHandle) {
    alert("Please open a folder first.");
    return;
  }

  // Find the smallest available "Untitled N" number
  const untitledRegex = /^Untitled (\d+)\.md$/;
  const existingNumbers = state.allFilePaths
    .map((path) => {
      const match = path.match(untitledRegex);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((num) => num !== null);

  let nextNum = 1;
  while (existingNumbers.includes(nextNum)) {
    nextNum++;
  }

  const newFilename = `Untitled ${nextNum}.md`;

  try {
    // Create the new file and open it in the active pane
    const newFileHandle = await state.notesDirectoryHandle.getFileHandle(
      newFilename,
      { create: true },
    );
    await loadAndIndexNotes(state.notesDirectoryHandle); // Re-index to include the new file
    await openFile(newFilename, state.activePane);
  } catch (error) {
    console.error("Error creating new file:", error);
    alert(`Could not create file: ${error.message}`);
  }
}

export async function renameFile(oldFileHandle, newName) {
  if (!newName.endsWith(".md")) {
    newName += ".md";
  }

  try {
    // We need to get the handle of the directory containing the file.
    // This is a bit tricky, so we'll re-traverse from the root.
    // First, find the full path of the old file.
    const oldPath = (
      await state.notesDirectoryHandle.resolve(oldFileHandle)
    ).join("/");
    const pathParts = oldPath.split("/");
    const oldFilename = pathParts.pop();

    let parentDirHandle = state.notesDirectoryHandle;
    for (const part of pathParts) {
      if (part) {
        // In case of leading slash
        parentDirHandle = await parentDirHandle.getDirectoryHandle(part);
      }
    }

    // 1. Read content of the old file
    const file = await oldFileHandle.getFile();
    const content = await file.text();

    // 2. Create the new file and write the content
    const newFileHandle = await parentDirHandle.getFileHandle(newName, {
      create: true,
    });
    const writable = await newFileHandle.createWritable();
    await writable.write(content);
    await writable.close();

    // 3. Delete the old file
    await parentDirHandle.removeEntry(oldFilename);

    // 4. Re-index everything and return the new handle
    await loadAndIndexNotes(state.notesDirectoryHandle);
    return newFileHandle;
  } catch (error) {
    console.error("Error renaming file:", error);
    alert(`Could not rename file: ${error.message}`);
    return null;
  }
}
// Modify the existing openFile function like this:
export async function openFile(filename, pane) {
  if (!state.notesDirectoryHandle || !pane) return;
  try {
    const fileHandle = await getFileHandleRecursive(
      state.notesDirectoryHandle,
      filename,
    );
    if (!fileHandle) throw new Error("File not found");

    const file = await fileHandle.getFile();
    const content = await file.text();

    pane.fileHandle = fileHandle;
    // This is the new part: update the pane's specific title element
    if (pane.titleElement) {
      pane.titleElement.textContent = filename;
    }

    pane.editorView.dispatch({
      changes: {
        from: 0,
        to: pane.editorView.state.doc.length,
        insert: content,
      },
    });

    document.querySelectorAll("#notes-list li").forEach((li) => {
      li.classList.toggle("active", li.dataset.filename === filename);
    });
  } catch (error) {
    console.error(`Error opening ${filename}:`, error);
  }
}

export function findFileByTitle(title) {
  const normalizedTitle = title.toLowerCase();
  return state.allFilePaths.find(
    (path) =>
      path.toLowerCase().endsWith(`/${normalizedTitle}.md`) ||
      path.toLowerCase() === `${normalizedTitle}.md`,
  );
}

async function verifyPermission(handle) {
  const options = { mode: "readwrite" };
  if ((await handle.queryPermission(options)) === "granted") return true;
  return (await handle.requestPermission(options)) === "granted";
}

export async function initializeFileHandling() {
  await idb.init();
  const storedHandle = await idb.get("directoryHandle");
  if (storedHandle && (await verifyPermission(storedHandle))) {
    state.notesDirectoryHandle = storedHandle;
    await loadAndIndexNotes(state.notesDirectoryHandle);
  }

  openFolderBtn.addEventListener("click", async () => {
    try {
      const handle = await window.showDirectoryPicker();
      if (await verifyPermission(handle)) {
        state.notesDirectoryHandle = handle;
        await idb.set("directoryHandle", handle);
        await loadAndIndexNotes(handle);
      }
    } catch (err) {
      console.log("User cancelled folder selection.");
    }
  });
}
