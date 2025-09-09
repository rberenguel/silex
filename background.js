chrome.action.onClicked.addListener((tab) => {
  const targetUrl = chrome.runtime.getURL("main.html");

  // Check if a tab with our main.html is already open
  chrome.tabs.query({ url: targetUrl }, (tabs) => {
    if (tabs.length > 0) {
      // If found, focus on the existing tab and window
      const existingTab = tabs[0];
      chrome.tabs.update(existingTab.id, { active: true });
      chrome.windows.update(existingTab.windowId, { focused: true });
    } else {
      // If not found, create a new tab
      chrome.tabs.create({ url: targetUrl });
    }
  });
});
