export const defaultSettings = {
  provider: 'deepseek',
  apiKey: '',
  model: 'deepseek-chat',
  endpoint: ''
};

export const defaultUiState = {
  sourceText: '',
  selectedLevel: 'A'
};

// Settings (including API key) are stored in chrome.storage.local so they
// survive MV3 service worker restarts. session storage is ephemeral and would
// cause the API key to be lost whenever the service worker is terminated.
export async function loadSettings() {
  const data = await chrome.storage.local.get(['settings']);
  if (data.settings) {
    return {
      ...defaultSettings,
      ...data.settings
    };
  }
  return { ...defaultSettings };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

export async function loadNotes() {
  const data = await chrome.storage.local.get(['notes']);
  return data.notes || [];
}

export async function saveNote(note) {
  const notes = await loadNotes();
  notes.unshift(note);
  await chrome.storage.local.set({ notes });
}

export async function deleteNote(noteId) {
  const notes = await loadNotes();
  await chrome.storage.local.set({
    notes: notes.filter((n) => n.id !== noteId)
  });
}

export async function loadUiState() {
  const data = await chrome.storage.local.get(['uiState']);
  return {
    ...defaultUiState,
    ...(data.uiState || {})
  };
}

export async function saveUiState(uiState) {
  await chrome.storage.local.set({
    uiState
  });
}
