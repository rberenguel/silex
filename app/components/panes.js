import { createEditor } from "./editor.js";
import { state, setActivePane } from "../core/state.js";
import { renameFile } from "../core/files.js";

const panesContainer = document.getElementById("panes-container");

function createPaneElement() {
  const paneElement = document.createElement("div");
  paneElement.className = "pane";

  const paneHeader = document.createElement("div");
  paneHeader.className = "pane-header";

  const paneTitle = document.createElement("span");
  paneTitle.className = "pane-title";
  paneTitle.textContent = "New Note";

  const closeButton = document.createElement("button");
  closeButton.className = "close-pane-btn";
  closeButton.textContent = "×";

  const editorContainer = document.createElement("div");
  editorContainer.className = "editor-wrapper";

  paneHeader.appendChild(paneTitle);
  paneHeader.appendChild(closeButton);
  paneElement.appendChild(paneHeader);
  paneElement.appendChild(editorContainer);

  const pane = createEditor(editorContainer, "");
  pane.element = paneElement;
  pane.titleElement = paneTitle;

  // Event listener for renaming
  paneTitle.addEventListener("click", () => {
    if (!pane.fileHandle) return; // Can't rename a file that doesn't exist
    const input = document.createElement("input");
    input.type = "text";
    input.className = "pane-title-input";
    input.value = pane.fileHandle.name;

    paneHeader.replaceChild(input, paneTitle);
    input.focus();
    input.select();

    const finishEditing = async () => {
      const newName = input.value.trim();
      // Check if name is valid and changed
      if (newName && newName !== pane.fileHandle.name) {
        const newHandle = await renameFile(pane.fileHandle, newName);
        if (newHandle) {
          pane.fileHandle = newHandle;
          paneTitle.textContent = newName;
        }
      }
      // Always revert back to the span
      paneHeader.replaceChild(paneTitle, input);
    };

    input.addEventListener("blur", finishEditing);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
      if (e.key === "Escape") {
        input.removeEventListener("blur", finishEditing);
        paneHeader.replaceChild(paneTitle, input);
      }
    });
  });

  paneElement.addEventListener("click", () => setActivePane(pane));
  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    closePane(pane);
  });

  return pane;
}

export function createInitialPane() {
  const pane = createPaneElement();
  panesContainer.appendChild(pane.element);
  setActivePane(pane);
}

function closePane(pane) {
  const paneElement = pane.element;
  const parent = paneElement.parentElement;

  paneElement.remove();

  if (
    parent.classList.contains("pane-container") &&
    parent.children.length === 1
  ) {
    const grandparent = parent.parentElement;
    grandparent.replaceChild(parent.children[0], parent);
  }

  if (state.activePane === pane) {
    const nextPane = document.querySelector(".pane");
    setActivePane(nextPane ? nextPane.paneObject : null);
  }

  if (panesContainer.children.length === 0) {
    createInitialPane();
  }
}

export function splitActivePane(direction) {
  if (!state.activePane) {
    createInitialPane();
    return;
  }

  const existingPane = state.activePane;
  const parent = existingPane.element.parentElement;

  const container = document.createElement("div");
  container.className = `pane-container ${direction}`;

  parent.replaceChild(container, existingPane.element);

  const newPane = createPaneElement();
  container.appendChild(existingPane.element);
  container.appendChild(newPane.element);

  setActivePane(newPane);
}
