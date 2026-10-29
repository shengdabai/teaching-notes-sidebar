import { generateTeachingNote } from './lib/llm-client.js';
import { buildPrompt } from './lib/prompt-builder.js';
import { loadNotes, loadSettings, loadUiState, saveNote, saveUiState } from './lib/storage.js';

function panelVisibilityKey(tabId) {
  return `panelVisible:${tabId}`;
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(panelVisibilityKey(tabId));
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
      if (sender.tab?.id != null) {
        chrome.storage.session.set({ [panelVisibilityKey(sender.tab.id)]: false });
      }
      break;
    case 'generate':
      (async () => {
        try {
          // The floating panel sends sourceText + level; build the prompt here so
          // prompt logic lives only in lib/prompt-builder.js (single source of truth).
          const prompt = msg.prompt || buildPrompt({ sourceText: msg.sourceText, level: msg.level });
          const result = await generateTeachingNote({
            provider: msg.provider,
            apiKey: msg.apiKey,
            model: msg.model,
            prompt,
            endpoint: msg.endpoint,
            level: msg.level
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

  const visibilityKey = panelVisibilityKey(tab.id);
  const storage = await chrome.storage.session.get(visibilityKey);
  if (storage[visibilityKey]) {
    chrome.tabs.sendMessage(tab.id, { action: 'hide-panel' });
    await chrome.storage.session.set({ [visibilityKey]: false });
  } else {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['injected-panel.js']
      });
    } catch (_) {}
    chrome.tabs.sendMessage(tab.id, { action: 'show-panel' });
    await chrome.storage.session.set({ [visibilityKey]: true });
  }
});
