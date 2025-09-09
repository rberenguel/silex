# Silex

> Silex is the Catalan work for _flint_. A rock, sharp, used to make tools.

This is a Chrome extension that can be pointed at an Obsidian vault and more or less read the files and edit them.
Also offers search (through Minisearch, title only for now) and a couple commands.

---

Rendering and styles are still a bit so-so. So far can only be considered a proof of concept. Hopefully I never need
to add any more features.

## Local development

This project is separated into two distinct parts:

1.  `bundler`: A folder where we can bundle codemirror and whatever else we need in a `codemirror-bundle.js` file.
2.  `the rest`: The actual Chrome Extension, written in pure vanilla JavaScript, with no build tools.

This leaves the extension dependency-free aside from the (hopefully fixed) bundle.

### Building the CodeMirror Bundle (A One-Time Task most of the time)

1.  **Navigate to the Bundler:**
    Open your terminal in the `codemirror-bundler` directory.

2.  **Install Dependencies:**
    Run `npm install`. This only installs tools needed for bundling (like Rollup).

3.  **Run the Build:**
    Run `npm run build`.

This command will read the dependencies from `package.json`, bundle them into a single file, and save it directly into the correct location: `chrome-notes-app/lib/codemirror-bundle.js`.

That's it. You are done with the `codemirror-bundler` folder. You can now ignore it, or even delete it, until you need to update CodeMirror in the future.

### Loading the Extension

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable "Developer mode".
3.  Click "Load unpacked" and select the **`Silex`** folder.
4.  Ready. Point it to a folder once you open it.

## Install

Git clone this repository somewhere and follow _Loading the Extension_ in the previous section.
