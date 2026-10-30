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

let pendingNoteWrite = Promise.resolve();

function updateNotes(update) {
  const write = async () => {
    const notes = await loadNotes();
    await chrome.storage.local.set({ notes: update(notes) });
  };
  // Share the read/write lock between the worker and standalone extension pages.
  if (globalThis.navigator?.locks?.request) {
    return navigator.locks.request('teaching-notes-write', write);
  }
  // Older environments still serialize writes within this module instance.
  const result = pendingNoteWrite.then(write);
  pendingNoteWrite = result.catch(() => {});
  return result;
}

export async function saveNote(note) {
  await updateNotes((notes) => [note, ...notes]);
}

export async function deleteNote(noteId) {
  await updateNotes((notes) => notes.filter((n) => n.id !== noteId));
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
