import { generateTeachingNote } from './lib/llm-client.js';
import { loadNotes, loadSettings, loadUiState, saveNote, saveUiState } from './lib/storage.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.session.set({ panelVisible: false });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.action) {
    case 'get-settings':
      loadSettings().then(sendResponse);
      return true;
    case 'get-notes':
      loadNotes().then((notes) => sendResponse(notes));
      return true;
    case 'save-note':
      saveNote(msg.note).catch(console.error);
      break;
    case 'get-ui-state':
      loadUiState().then(sendResponse);
      return true;
    case 'save-ui-state':
      saveUiState(msg.state).catch(console.error);
      break;
    case 'panel-hidden':
      chrome.storage.session.set({ panelVisible: false });
      break;
    case 'generate':
      (async () => {
        try {
          const result = await generateTeachingNote({
            provider: msg.provider,
            apiKey: msg.apiKey,
            model: msg.model,
            prompt: msg.prompt,
            endpoint: msg.endpoint
          });
          sendResponse(result);
        } catch (err) {
          sendResponse({ error: err.message });
        }
      })();
      return true;
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url?.startsWith('http')) return;

  const storage = await chrome.storage.session.get('panelVisible');
  if (storage.panelVisible) {
    chrome.tabs.sendMessage(tab.id, { action: 'hide-panel' });
    await chrome.storage.session.set({ panelVisible: false });
  } else {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['injected-panel.js']
      });
    } catch (_) {}
    chrome.tabs.sendMessage(tab.id, { action: 'show-panel' });
    await chrome.storage.session.set({ panelVisible: true });
  }
});
