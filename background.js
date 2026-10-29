import { generateTeachingNote } from './lib/llm-client.js';
import { buildPrompt } from './lib/prompt-builder.js';
import { loadNotes, loadSettings, loadUiState, saveNote, saveUiState } from './lib/storage.js';

function panelVisibilityKey(tabId) {
  return `panelVisible:${tabId}`;
}

function respondWith(promise, sendResponse) {
  promise.then(sendResponse, (error) => sendResponse({ error: error.message || 'Extension request failed.' }));
  return true;
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(panelVisibilityKey(tabId));
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.action) {
    case 'get-settings':
      return respondWith(loadSettings(), sendResponse);
    case 'get-notes':
      return respondWith(loadNotes(), sendResponse);
    case 'save-note':
      (async () => {
        try {
          // Extension contexts have randomUUID even when the host page uses HTTP.
          await saveNote({ ...msg.note, id: msg.note.id || crypto.randomUUID() });
          sendResponse({ ok: true });
        } catch (error) {
          sendResponse({ error: error.message || 'Failed to save note.' });
        }
      })();
      return true;
    case 'get-ui-state':
      return respondWith(loadUiState(), sendResponse);
    case 'open-settings':
      return respondWith(chrome.runtime.openOptionsPage().then(() => ({ ok: true })), sendResponse);
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
