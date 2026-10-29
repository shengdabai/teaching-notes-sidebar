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

function getSettingsStorageArea() {
  return chrome.storage.session || chrome.storage.local;
}

export async function loadSettings() {
  const settingsStorage = getSettingsStorageArea();
  const sessionData = await settingsStorage.get(['settings']);
  if (sessionData.settings) {
    return {
      ...defaultSettings,
      ...sessionData.settings
    };
  }

  const legacyData = await chrome.storage.local.get(['settings']);
  if (legacyData.settings) {
    if (chrome.storage.session) {
      await chrome.storage.session.set({ settings: legacyData.settings });
      if (typeof chrome.storage.local.remove === 'function') {
        await chrome.storage.local.remove(['settings']);
      }
    }

    return {
      ...defaultSettings,
      ...legacyData.settings
    };
  }

  return { ...defaultSettings };
}

export async function saveSettings(settings) {
  await getSettingsStorageArea().set({ settings });
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
