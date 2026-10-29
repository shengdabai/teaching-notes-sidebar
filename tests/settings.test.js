import { describe, expect, test, vi } from 'vitest';

vi.mock('../lib/storage.js', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  loadNotes: vi.fn(),
  saveNote: vi.fn(),
  deleteNote: vi.fn(),
  loadUiState: vi.fn(),
  saveUiState: vi.fn()
}));

vi.mock('../lib/llm-client.js', async (importOriginal) => ({
  ...await importOriginal(),
  testLlmConnection: vi.fn().mockResolvedValue(true)
}));

import { loadSettings, saveSettings } from '../lib/storage.js';

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
    const { initSettingsPage } = await import('../settings.js');
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
    const { initSettingsPage } = await import('../settings.js');
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
    const { initSettingsPage } = await import('../settings.js');
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
    const { initSettingsPage } = await import('../settings.js');
    await initSettingsPage();

    document.querySelector('#provider').value = 'gemini';
    document.querySelector('#provider').dispatchEvent(new Event('change', { bubbles: true }));

    expect([...document.querySelector('#model').options].map((option) => option.value))
      .toEqual(['gemini-2.5-flash', 'gemini-2.5-pro']);
    expect(document.querySelector('#model').value).toBe('gemini-2.5-flash');
    expect(document.querySelector('#endpoint-group').style.display).toBe('none');
  });

  test.each(['custom', 'deepseek'])('preserves a saved %s endpoint when reopening settings', async (provider) => {
    const settings = {
      provider,
      apiKey: 'test-key',
      model: provider === 'custom' ? 'example-model' : 'deepseek-chat',
      endpoint: 'https://api.example.com/v1/chat/completions'
    };
    loadSettings.mockResolvedValue(settings);
    const { initSettingsPage } = await import('../settings.js');

    for (let reopen = 0; reopen < 2; reopen++) {
      setupDOM();
      await initSettingsPage();
      expect(document.querySelector('#endpoint').value).toBe(settings.endpoint);
      expect(document.querySelector('#model').value).toBe(settings.model);
      document.querySelector('#settings-form').dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true })
      );
      await vi.waitFor(() => expect(document.querySelector('#status').textContent).toBe('Settings saved.'));
      expect(saveSettings).toHaveBeenLastCalledWith(settings);
    }
  });

  test('cancel restores the saved custom endpoint after switching providers', async () => {
    const settings = {
      provider: 'custom', apiKey: 'test-key', model: 'example-model',
      endpoint: 'https://api.example.com/v1/chat/completions'
    };
    loadSettings.mockResolvedValue(settings);
    setupDOM();
    const { initSettingsPage } = await import('../settings.js');
    await initSettingsPage();
    document.querySelector('#provider').value = 'deepseek';
    document.querySelector('#provider').dispatchEvent(new Event('change'));
    expect(document.querySelector('#endpoint').value).toBe('');
    document.querySelector('#endpoint').value = 'https://unsaved.example.com';
    document.querySelector('#cancel-button').click();

    await vi.waitFor(() => expect(document.querySelector('#status').textContent).toBe('Changes discarded.'));
    expect(document.querySelector('#provider').value).toBe('custom');
    expect(document.querySelector('#endpoint').value).toBe(settings.endpoint);
    expect(document.querySelector('#model').value).toBe(settings.model);
  });

  test('reopens saved Gemini settings with the selected model', async () => {
    loadSettings.mockResolvedValue({
      provider: 'gemini', apiKey: 'test-key', model: 'gemini-2.5-pro', endpoint: ''
    });
    setupDOM();
    const { initSettingsPage } = await import('../settings.js');
    await initSettingsPage();

    expect(document.querySelector('#model').value).toBe('gemini-2.5-pro');
    expect(document.querySelector('#endpoint-group').style.display).toBe('none');
  });
});
