import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  // The entry point of our bundle
  input: "codemirror-bundle.js",
  output: {
    // The destination for our browser-ready bundle
    file: "../lib/codemirror-bundle.js",
    format: "iife", // Immediately-Invoked Function Expression
    // This name will be the global variable under which the exports are available
    name: "CodeMirrorBundle",
  },
  plugins: [nodeResolve()],
};
