import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../lib/storage.js', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  loadNotes: vi.fn(),
  saveNote: vi.fn(),
  deleteNote: vi.fn(),
  loadUiState: vi.fn(),
  saveUiState: vi.fn()
}));

vi.mock('../lib/llm-client.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    testLlmConnection: vi.fn().mockResolvedValue(true),
    getProviderConfig: vi.fn(actual.getProviderConfig)
  };
});

import { loadSettings, saveSettings } from '../lib/storage.js';
import { testLlmConnection, getProviderConfig } from '../lib/llm-client.js';
import { initSettingsPage } from '../settings.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('settings page', () => {
  function setupDOM() {
    document.body.innerHTML = `
      <form id="settings-form">
        <select id="provider">
          <option value="deepseek">DeepSeek</option>
          <option value="gemini">Google Gemini</option>
          <option value="custom">Custom</option>
        </select>
        <label class="field-group" id="endpoint-group" for="endpoint">
          <span>API Endpoint</span>
          <input id="endpoint" type="url" />
        </label>
        <select id="model">
          <option value="deepseek-chat">deepseek-chat</option>
        </select>
        <input id="api-key" type="password" />
        <button id="test-connection" type="button">Test Connection</button>
        <button id="cancel-button" type="button">Cancel</button>
        <button id="save-button" type="submit">Save</button>
      </form>
      <div id="status"></div>
    `;
  }

  test('loads saved settings into the form', async () => {
    loadSettings.mockResolvedValue({
      provider: 'deepseek',
      apiKey: 'existing-key',
      model: 'deepseek-chat',
      endpoint: ''
    });

    setupDOM();
    await initSettingsPage();

    expect(document.querySelector('#provider').value).toBe('deepseek');
    expect(document.querySelector('#api-key').value).toBe('existing-key');
    expect(document.querySelector('#model').value).toBe('deepseek-chat');
  });

  test('saves settings on submit', async () => {
    loadSettings.mockResolvedValue({
      provider: 'deepseek',
      apiKey: 'existing-key',
      model: 'deepseek-chat',
      endpoint: ''
    });
    saveSettings.mockResolvedValue();

    setupDOM();
    await initSettingsPage();
    document.querySelector('#api-key').value = 'new-key';

    document.querySelector('#settings-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => {
      expect(saveSettings).toHaveBeenCalledWith({
        provider: 'deepseek',
        apiKey: 'new-key',
        model: 'deepseek-chat',
        endpoint: ''
      });
      expect(document.querySelector('#status').textContent).toContain('saved');
    });
  });

  test('cancel restores the last saved values', async () => {
    loadSettings.mockClear();
    loadSettings.mockResolvedValue({
      provider: 'deepseek',
      apiKey: 'existing-key',
      model: 'deepseek-chat',
      endpoint: ''
    });

    setupDOM();
    await initSettingsPage();
    document.querySelector('#api-key').value = 'changed-key';

    document.querySelector('#cancel-button').click();

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(document.querySelector('#api-key').value).toBe('existing-key');
  });

  test('switching provider updates model options', async () => {
    loadSettings.mockResolvedValue({
      provider: 'deepseek',
      apiKey: 'key',
      model: 'deepseek-chat',
      endpoint: ''
    });

    setupDOM();
    await initSettingsPage();

    document.querySelector('#provider').value = 'gemini';
    document.querySelector('#provider').dispatchEvent(new Event('change', { bubbles: true }));

    expect(getProviderConfig).toHaveBeenCalledWith('gemini');
  });

  const customSettings = {
    provider: 'custom',
    apiKey: 'test-key',
    model: 'test-model',
    endpoint: 'https://api.example.com/v1/chat/completions'
  };

  async function openCustomSettings() {
    loadSettings.mockResolvedValue({ ...customSettings });
    saveSettings.mockClear();
    setupDOM();
    await initSettingsPage();
  }

  test('opening settings preserves the saved custom endpoint', async () => {
    await openCustomSettings();

    expect(document.querySelector('#provider').value).toBe('custom');
    expect(document.querySelector('#model').value).toBe(customSettings.model);
    expect(document.querySelector('#endpoint').value).toBe(customSettings.endpoint);
    expect(document.querySelector('#endpoint-group').style.display).toBe('');
    expect(saveSettings).not.toHaveBeenCalled();
  });

  test('cancel restores the saved custom endpoint after switching providers', async () => {
    await openCustomSettings();
    const provider = document.querySelector('#provider');
    provider.value = 'gemini';
    provider.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#endpoint').value = 'https://unsaved.example.com';

    document.querySelector('#cancel-button').click();

    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toBe('Changes discarded.');
      expect(provider.value).toBe('custom');
      expect(document.querySelector('#model').value).toBe(customSettings.model);
      expect(document.querySelector('#endpoint').value).toBe(customSettings.endpoint);
      expect(document.querySelector('#endpoint-group').style.display).toBe('');
    });
    expect(saveSettings).not.toHaveBeenCalled();
  });

  test.each(['deepseek', 'gemini'])('switching from custom to %s clears the endpoint', async (nextProvider) => {
    await openCustomSettings();
    const provider = document.querySelector('#provider');
    // Set the current input explicitly so this test isolates the change event.
    document.querySelector('#endpoint').value = customSettings.endpoint;
    provider.value = nextProvider;

    provider.dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.querySelector('#endpoint').value).toBe('');
    expect(document.querySelector('#endpoint-group').style.display).toBe(nextProvider === 'gemini' ? 'none' : '');
    expect(saveSettings).not.toHaveBeenCalled();
  });

  test('loads and saves Gemini using real provider metadata', async () => {
    loadSettings.mockResolvedValue({ provider: 'gemini', apiKey: 'test-key', model: 'gemini-2.5-pro', endpoint: '' });
    setupDOM();
    await initSettingsPage();
    expect([...document.querySelector('#model').options].map((option) => option.value))
      .toEqual(['gemini-2.5-flash', 'gemini-2.5-pro']);
    expect(document.querySelector('#model').value).toBe('gemini-2.5-pro');
    expect(document.querySelector('#endpoint-group').style.display).toBe('none');
    document.querySelector('#settings-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => {
      expect(saveSettings).toHaveBeenCalledWith({ provider: 'gemini', apiKey: 'test-key', model: 'gemini-2.5-pro', endpoint: '' });
    });
  });

  test('selecting Gemini offers its default model and clears the previous provider key', async () => {
    await openCustomSettings();
    const provider = document.querySelector('#provider');
    provider.value = 'gemini';
    provider.dispatchEvent(new Event('change'));
    expect(document.querySelector('#model').value).toBe('gemini-2.5-flash');
    expect(document.querySelector('#api-key').value).toBe('');
    expect(saveSettings).not.toHaveBeenCalled();
  });

  test('Cancel restores the provider key as well as endpoint and model', async () => {
    await openCustomSettings();
    document.querySelector('#provider').value = 'gemini';
    document.querySelector('#provider').dispatchEvent(new Event('change'));
    document.querySelector('#cancel-button').click();
    await vi.waitFor(() => {
      expect(document.querySelector('#api-key').value).toBe(customSettings.apiKey);
      expect(document.querySelector('#model').value).toBe(customSettings.model);
      expect(document.querySelector('#endpoint').value).toBe(customSettings.endpoint);
    });
  });

  test('deduplicates connection tests, locks the form and releases it after failure', async () => {
    await openCustomSettings();
    let rejectRequest;
    testLlmConnection.mockImplementationOnce(() => new Promise((resolve, reject) => { rejectRequest = reject; }));
    const button = document.querySelector('#test-connection');
    button.click();
    button.click();
    expect(testLlmConnection).toHaveBeenCalledTimes(1);
    for (const selector of ['#provider', '#api-key', '#model', '#endpoint', '#cancel-button', '#save-button', '#test-connection']) {
      expect(document.querySelector(selector).disabled).toBe(true);
    }
    // Even a synthetic submit must not race a pending connection test.
    document.querySelector('#settings-form').dispatchEvent(new Event('submit', { cancelable: true }));
    expect(saveSettings).not.toHaveBeenCalled();
    rejectRequest(new Error('Mock connection rejected'));
    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toBe('Mock connection rejected');
      expect(button.disabled).toBe(false);
      expect(document.querySelector('#provider').disabled).toBe(false);
    });
    button.click();
    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toBe('Connection successful.');
      expect(button.disabled).toBe(false);
    });
    expect(testLlmConnection).toHaveBeenCalledTimes(2);
  });

  test('locks fields while saving and prevents a concurrent connection test', async () => {
    await openCustomSettings();
    let finishSave;
    saveSettings.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
    const form = document.querySelector('#settings-form');
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    document.querySelector('#test-connection').click();
    expect(saveSettings).toHaveBeenCalledTimes(1);
    expect(testLlmConnection).not.toHaveBeenCalled();
    expect(document.querySelector('#api-key').disabled).toBe(true);
    finishSave();
    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toBe('Settings saved.');
      expect(document.querySelector('#api-key').disabled).toBe(false);
    });
  });

  test('reports Cancel read failures and preserves unsaved form values', async () => {
    await openCustomSettings();
    document.querySelector('#model').value = 'unsaved-model';
    loadSettings.mockRejectedValueOnce(new Error('Mock storage read failed'));
    document.querySelector('#cancel-button').click();
    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toBe('Mock storage read failed');
      expect(document.querySelector('#status').classList.contains('error')).toBe(true);
      expect(document.querySelector('#cancel-button').disabled).toBe(false);
    });
    expect(document.querySelector('#model').value).toBe('unsaved-model');
    expect(saveSettings).not.toHaveBeenCalled();
  });

  test.each(['', 'http://api.example.com/v1'])('rejects invalid custom endpoint %s without saving or testing', async (endpoint) => {
    await openCustomSettings();
    document.querySelector('#endpoint').value = endpoint;
    document.querySelector('#settings-form').dispatchEvent(new Event('submit', { cancelable: true }));
    document.querySelector('#test-connection').click();
    expect(saveSettings).not.toHaveBeenCalled();
    expect(testLlmConnection).not.toHaveBeenCalled();
    expect(document.querySelector('#status').textContent).toContain('endpoint');
    expect(document.querySelector('#status').classList.contains('error')).toBe(true);
  });

  test('releases form controls after a failed save and allows retry', async () => {
    await openCustomSettings();
    saveSettings.mockRejectedValueOnce(new Error('Mock storage write failed'));
    document.querySelector('#settings-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toBe('Mock storage write failed');
      expect(document.querySelector('#save-button').disabled).toBe(false);
    });
    document.querySelector('#settings-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toBe('Settings saved.');
      expect(saveSettings).toHaveBeenCalledTimes(2);
    });
  });

  test('locks fields until the initial settings read completes', async () => {
    let finishRead;
    loadSettings.mockImplementationOnce(() => new Promise((resolve) => { finishRead = resolve; }));
    setupDOM();
    const initializing = initSettingsPage();
    expect(document.querySelector('#provider').disabled).toBe(true);
    expect(document.querySelector('#save-button').disabled).toBe(true);
    finishRead({ ...customSettings });
    await initializing;
    expect(document.querySelector('#model').value).toBe(customSettings.model);
    expect(document.querySelector('#model').disabled).toBe(false);
    expect(document.querySelector('#save-button').disabled).toBe(false);
  });
});
