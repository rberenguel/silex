const vscode = acquireVsCodeApi();

// A helper function to send a message and expect a response
function sendMessage(type, payload) {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).substr(2, 9);

    const listener = (event) => {
      const message = event.data;
      if (message.requestId === requestId) {
        window.removeEventListener("message", listener);
        if (message.error) {
          reject(new Error(message.error));
        } else {
          resolve(message.payload);
        }
      }
    };

    window.addEventListener("message", listener);

    vscode.postMessage({
      type,
      requestId,
      payload,
    });
  });
}

export function getInitialFiles() {
  return sendMessage("getInitialFiles");
}

export function readFile(path) {
  return sendMessage("readFile", { path });
}

export function writeFile(path, content) {
  return sendMessage("writeFile", { path, content });
}

export function createNewFile(path) {
  return sendMessage("createNewFile", { path });
}

export function renameFile(oldPath, newPath) {
  return sendMessage("renameFile", { oldPath, newPath });
}
