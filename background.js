// The toolbar button opens the extension's own side panel (chrome-extension:// origin).
// Nothing is injected into web pages, so page scripts can't read or alter drafts and results.
function openPanelOnActionClick() {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((err) => console.warn('setPanelBehavior failed:', err.message));
}

chrome.runtime.onInstalled.addListener(openPanelOnActionClick);
chrome.runtime.onStartup.addListener(openPanelOnActionClick);
