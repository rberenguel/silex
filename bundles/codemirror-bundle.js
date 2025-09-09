import { EditorState } from "@codemirror/state";
import { EditorView, keymap, Decoration } from "@codemirror/view";
import { defaultKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { autocompletion, completionKeymap } from "@codemirror/autocomplete";
import { oneDark } from "@codemirror/theme-one-dark";
import MiniSearch from "minisearch";
import { syntaxTree } from "@codemirror/language";
import { GFM } from "@lezer/markdown"; // <-- The correct import

export {
  EditorState,
  EditorView,
  keymap,
  defaultKeymap,
  markdown,
  oneDark,
  MiniSearch,
  // For the live preview plugin
  Decoration,
  syntaxTree,
  markdownLanguage,
  autocompletion,
  completionKeymap,
  GFM,
};
