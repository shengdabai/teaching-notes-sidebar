import { beforeEach, describe, expect, test, vi } from 'vitest';
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

describe('storage helpers', () => {
  beforeEach(() => {
    let tail = Promise.resolve();
    Object.defineProperty(globalThis.navigator, 'locks', {configurable:true,value:{request:vi.fn((_name, action) => {
      const next = tail.catch(() => {}).then(action); tail = next; return next;
    })}});
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
    chrome.storage.session.get.mockResolvedValue({});
    chrome.storage.local.get.mockResolvedValue({});

    await expect(loadSettings()).resolves.toEqual(defaultSettings);
  });

  test('persists settings in session storage when available', async () => {
    chrome.storage.session.set.mockResolvedValue();

    await saveSettings({ provider: 'deepseek', apiKey: 'key', model: 'deepseek-chat', endpoint: '' });

    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      settings: {
        provider: 'deepseek',
        apiKey: 'key',
        model: 'deepseek-chat',
        endpoint: ''
      }
    });
    expect(chrome.storage.local.set).not.toHaveBeenCalled();
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
});

test('concurrent saves and deletes preserve unrelated notes', async () => {
  let tail=Promise.resolve();
  Object.defineProperty(globalThis.navigator,'locks',{configurable:true,value:{request:(_name,action)=>{const next=tail.catch(()=>{}).then(action);tail=next;return next;}}});
  let notes=[{id:'old'}];
  globalThis.chrome={storage:{local:{get:async()=>({notes:structuredClone(notes)}),set:async(data)=>{await new Promise(resolve=>setTimeout(resolve,1));notes=structuredClone(data.notes);}}}};
  await Promise.all([saveNote({id:'A'}),saveNote({id:'B'})]);
  expect(notes.map(n=>n.id)).toEqual(['B','A','old']);
  await Promise.all([saveNote({id:'C'}),deleteNote('A')]);
  expect(notes.map(n=>n.id)).toEqual(['C','B','old']);
});
