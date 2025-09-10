import { openFile } from "../core/files.js";
import { state } from "../core/state.js";

const notesList = document.getElementById("notes-list");
const appContainer = document.getElementById("app-container");
const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");

function renderTreeToDOM(nodes, container) {
  container.innerHTML = "";
  for (const node of nodes) {
    if (node.type === "folder") {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = node.name;
      details.appendChild(summary);

      const sublist = document.createElement("ul");
      renderTreeToDOM(node.children, sublist); // Recurse for children
      details.appendChild(sublist);
      container.appendChild(details);
    } else {
      const li = document.createElement("li");
      li.textContent = node.name;
      li.dataset.filename = node.path;
      li.classList.add("sidebar-file");
      container.appendChild(li);
    }
  }
}

export function loadSidebarList(tree) {
  renderTreeToDOM(tree, notesList);
}

export function initializeSidebar() {
  notesList.addEventListener("click", (e) => {
    if (e.target?.tagName === "LI") {
      openFile(e.target.dataset.filename, state.activePane);
    }
  });

  sidebarToggleBtn.addEventListener("click", () => {
    appContainer.classList.toggle("sidebar-hidden");
  });
}
