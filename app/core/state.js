export const state = {
  editorView: null,
  notesDirectoryHandle: null,
  currentlyOpenFileHandle: null,
  allNoteCommands: [],
  fileSearchIndex: null,
  allFilePaths: [],
  activePane: null, // To track the active editor pane
};

export function setActivePane(pane) {
  state.activePane = pane;
}
