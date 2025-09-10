import {
  EditorState,
  EditorView,
  keymap,
  defaultKeymap,
  markdown,
  oneDark,
  Decoration,
  syntaxTree,
  markdownLanguage,
  autocompletion,
  completionKeymap,
  GFM,
} from "CodeMirrorBundle"; // Use the import map
import { state } from "../core/state.js";
import { saveFile, findFileByTitle, openFile } from "../core/files.js";

// This listener handles auto-saving.
function onUpdate(pane) {
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      clearTimeout(pane.saveTimeout);
      pane.saveTimeout = setTimeout(() => {
        const content = update.state.doc.toString();
        if (pane.filePath) {
          saveFile(pane.filePath, content);
        }
      }, 500);
    }
  });
}

// ### FIX STARTS HERE ###
// This plugin was missing. It finds "Link" nodes in the syntax tree
// and applies a CSS class to them, making them visually distinct.
const livePreviewPlugin = EditorView.decorations.compute(["doc"], (state) => {
  let decorations = [];
  syntaxTree(state).iterate({
    enter: (node) => {
      const { type, from, to } = node;

      switch (type.name) {
        case "Link":
          decorations.push(
            Decoration.mark({ class: "cm-wikilink" }).range(from, to),
          );
          break;
        case "HeaderMark":
        case "QuoteMark":
        case "ListMark":
          // Apply a class to syntax characters so they can be hidden by CSS
          decorations.push(
            Decoration.mark({ class: "cm-formatting" }).range(from, to),
          );
          break;
        case "ATXHeading1":
          decorations.push(
            Decoration.line({ class: "cm-header-1" }).range(from),
          );
          break;
        case "ATXHeading2":
          decorations.push(
            Decoration.line({ class: "cm-header-2" }).range(from),
          );
          break;
        case "ATXHeading3":
          decorations.push(
            Decoration.line({ class: "cm-header-3" }).range(from),
          );
          break;
        case "Blockquote":
          decorations.push(Decoration.line({ class: "cm-quote" }).range(from));
          break;
      }
    },
  });
  return Decoration.set(decorations);
});

// This is the click handler for wikilinks. It was present but couldn't
// work without the styled links from the plugin above.
const wikilinkClickHandler = EditorView.domEventHandlers({
  mousedown: (event, view) => {
    const pos = view.posAtCoords(event);
    if (!pos) return false;

    let clickedOnLink = false;
    syntaxTree(view.state).iterate({
      enter: (node) => {
        if (node.name === "Link") {
          clickedOnLink = true;
          const linkText = view.state.doc.sliceString(
            node.from + 1,
            node.to - 1,
          );
          const targetPath = findFileByTitle(linkText);
          if (targetPath) {
            event.preventDefault();
            openFile(targetPath, state.activePane);
          }
        }
      },
      from: pos,
      to: pos,
    });
    return clickedOnLink;
  },
});

// This handles wikilink autocompletion.
const wikilinkCompletion = (context) => {
  let match = context.matchBefore(/\[\[([^\]]*)$/);
  if (!match) return null;

  let query = match.text.slice(2);
  let results = state.fileSearchIndex
    .search(query, { prefix: true, fuzzy: 0.2 })
    .slice(0, 10);

  return {
    from: match.from + 2,
    options: results.map((r) => ({
      label: r.name,
      apply: r.name,
    })),
  };
};

export function createEditor(parent, doc = "") {
  const pane = {
    editorView: null,
    filePath: null,
    saveTimeout: null,
  };

  const editorState = EditorState.create({
    doc,
    extensions: [
      markdown({ base: markdownLanguage, extensions: GFM }),
      oneDark,
      EditorView.lineWrapping,
      onUpdate(pane),
      livePreviewPlugin, // Activate the restored plugin
      wikilinkClickHandler,
      autocompletion({ override: [wikilinkCompletion] }),
      keymap.of([...defaultKeymap, ...completionKeymap]),
    ],
  });

  pane.editorView = new EditorView({
    state: editorState,
    parent,
  });

  parent.parentElement.paneObject = pane;

  return pane;
}
