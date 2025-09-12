// Chrome Extension bridge for the Silex app.
// This file will mock the VS Code API using chrome.* APIs.
// This file is currently a placeholder.

window.acquireVsCodeApi = () => ({
  postMessage: (message) => {
    console.log("Message from App:", message);
    // Handle messages, e.g., using chrome.storage or other APIs
  },
  getState: () => ({}),
  setState: (state) => console.log("Setting state:", state),
});
