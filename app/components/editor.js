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
} from "../../lib/codemirror-bundle.js";
import { state } from "../core/state.js";
import { findFileByTitle, openFile } from "../core/files.js";

async function saveFile(pane) {
  if (!pane.fileHandle || !pane.editorView) return;
  try {
    const content = pane.editorView.state.doc.toString();
    const writable = await pane.fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (error) {
    console.error("Error saving file:", error);
  }
}

function onUpdate(pane) {
  return EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      clearTimeout(pane.saveTimeout);
      pane.saveTimeout = setTimeout(() => saveFile(pane), 500);
    }
  });
}

const livePreviewPlugin = EditorView.decorations.compute(
  ["doc", "selection"],
  (state) => {
    let decorations = [];
    const activeLine = state.doc.lineAt(state.selection.main.head).from;

    syntaxTree(state).iterate({
      enter: (node) => {
        const { type, from, to } = node;
        const lineStart = state.doc.lineAt(from).from;
        const onActiveLine = lineStart === activeLine;

        if (type.name === "Link") {
          decorations.push(
            Decoration.mark({ class: "cm-wikilink" }).range(from, to),
          );
          return;
        }

        if (onActiveLine) return;

        if (type.name.endsWith("Mark")) {
          decorations.push(
            Decoration.mark({ class: "cm-formatting" }).range(from, to),
          );
        } else if (type.name.startsWith("ATXHeading")) {
          const headerText = state.doc.sliceString(from, to);
          const level = headerText.match(/^#+/)[0].length;
          decorations.push(
            Decoration.line({ class: `cm-header cm-header-${level}` }).range(
              from,
            ),
          );
        } else if (type.name === "Blockquote") {
          decorations.push(Decoration.line({ class: "cm-quote" }).range(from));
        }
      },
    });
    return Decoration.set(decorations, true);
  },
);

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
            openFile(targetPath); // Assumes openFile can handle which pane to open in
          }
        }
      },
      from: pos,
      to: pos,
    });
    return clickedOnLink;
  },
});

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
    fileHandle: null,
    saveTimeout: null,
  };

  const editorState = EditorState.create({
    doc,
    extensions: [
      markdown({
        base: markdownLanguage,
        extensions: GFM,
      }),
      oneDark,
      EditorView.lineWrapping,
      onUpdate(pane),
      livePreviewPlugin,
      autocompletion({ override: [wikilinkCompletion] }),
      wikilinkClickHandler,
      keymap.of([...defaultKeymap, ...completionKeymap]),
    ],
  });

  pane.editorView = new EditorView({
    state: editorState,
    parent,
  });

  return pane;
}
