import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  defaultSettings,
  deleteNote,
  loadNotes,
  loadSettings,
  loadUiState,
  saveNote,
  saveSettings,
  saveUiState
} from '../lib/storage.js';

const locksDescriptor = Object.getOwnPropertyDescriptor(navigator, 'locks');

describe('storage helpers', () => {
  afterEach(() => {
    if (locksDescriptor) Object.defineProperty(navigator, 'locks', locksDescriptor);
    else delete navigator.locks;
  });

  beforeEach(() => {
    global.chrome = {
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
          remove: vi.fn()
        },
        session: {
          get: vi.fn(),
          set: vi.fn()
        }
      }
    };
  });

  test('returns defaults when settings are empty', async () => {
    chrome.storage.local.get.mockResolvedValue({});

    await expect(loadSettings()).resolves.toEqual(defaultSettings);
  });

  test('persists settings in local storage (survives service worker restarts)', async () => {
    chrome.storage.local.set.mockResolvedValue();

    await saveSettings({ provider: 'deepseek', apiKey: 'key', model: 'deepseek-chat', endpoint: '' });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      settings: {
        provider: 'deepseek',
        apiKey: 'key',
        model: 'deepseek-chat',
        endpoint: ''
      }
    });
    expect(chrome.storage.session.set).not.toHaveBeenCalled();
  });

  test('prepends notes when saving', async () => {
    chrome.storage.local.get.mockResolvedValue({ notes: [{ id: 'old' }] });
    chrome.storage.local.set.mockResolvedValue();

    await saveNote({ id: 'new' });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      notes: [{ id: 'new' }, { id: 'old' }]
    });
  });

  test('returns an empty array when notes are missing', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    await expect(loadNotes()).resolves.toEqual([]);
  });

  test('returns default ui state when none was saved', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    await expect(loadUiState()).resolves.toEqual({
      sourceText: '',
      selectedLevel: 'A'
    });
  });

  test('persists ui state under the uiState key', async () => {
    chrome.storage.local.set.mockResolvedValue();

    await saveUiState({
      sourceText: '经济发展',
      selectedLevel: 'B'
    });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      uiState: {
        sourceText: '经济发展',
        selectedLevel: 'B'
      }
    });
  });

  function useStoredNotes(initialNotes = []) {
    let notes = initialNotes;
    chrome.storage.local.get.mockImplementation(async () => ({ notes: structuredClone(notes) }));
    chrome.storage.local.set.mockImplementation(async (data) => {
      // A storage round trip leaves time for another caller to read the old list.
      await new Promise((resolve) => setTimeout(resolve, 0));
      notes = structuredClone(data.notes);
    });
    return () => notes;
  }

  function useSharedLocks() {
    const queues = new Map();
    const request = vi.fn((name, callback) => {
      const result = (queues.get(name) || Promise.resolve()).then(callback);
      queues.set(name, result.catch(() => {}));
      return result;
    });
    Object.defineProperty(navigator, 'locks', { configurable: true, value: { request } });
    return request;
  }

  test('preserves concurrent notes from different extension contexts', async () => {
    const storedNotes = useStoredNotes([{ id: 'original' }]);
    const request = useSharedLocks();
    vi.resetModules();
    const otherContext = await import('../lib/storage.js');
    await Promise.all([saveNote({ id: 'first' }), otherContext.saveNote({ id: 'second' })]);
    expect(storedNotes().map((note) => note.id)).toEqual(['second', 'first', 'original']);
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0]).toBe(request.mock.calls[1][0]);
  });

  test('serializes deletion with saving so deleted notes do not reappear', async () => {
    const storedNotes = useStoredNotes([{ id: 'remove' }, { id: 'keep' }]);
    useSharedLocks();
    await Promise.all([deleteNote('remove'), saveNote({ id: 'new' })]);
    expect(storedNotes().map((note) => note.id)).toEqual(['new', 'keep']);
  });

  test('a failed write releases the lock and leaves existing notes intact', async () => {
    const storedNotes = useStoredNotes([{ id: 'keep' }]);
    useSharedLocks();
    chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage unavailable.'));
    await expect(saveNote({ id: 'failed' })).rejects.toThrow('Storage unavailable.');
    await saveNote({ id: 'retry' });
    expect(storedNotes().map((note) => note.id)).toEqual(['retry', 'keep']);
  });

  test('serializes same-context writes when the Web Locks API is unavailable', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    const storedNotes = useStoredNotes([{ id: 'keep' }]);
    await Promise.all([saveNote({ id: 'first' }), saveNote({ id: 'second' })]);
    expect(storedNotes().map((note) => note.id)).toEqual(['second', 'first', 'keep']);
  });

  test('a failed fallback write does not prevent the next save', async () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    const storedNotes = useStoredNotes([{ id: 'keep' }]);
    chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage unavailable.'));
    await expect(saveNote({ id: 'failed' })).rejects.toThrow('Storage unavailable.');
    await saveNote({ id: 'retry' });
    expect(storedNotes().map((note) => note.id)).toEqual(['retry', 'keep']);
  });
});
