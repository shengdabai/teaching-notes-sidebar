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

vi.mock('../lib/llm-client.js', () => ({
  testLlmConnection: vi.fn().mockResolvedValue(true),
  getProviderConfig: vi.fn().mockReturnValue({
    models: ['deepseek-chat'],
    defaultModel: 'deepseek-chat',
    defaultEndpoint: 'https://api.deepseek.com/v1/chat/completions'
  })
}));

import { loadSettings, saveSettings } from '../lib/storage.js';
import { testLlmConnection, getProviderConfig } from '../lib/llm-client.js';

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

    expect(getProviderConfig).toHaveBeenCalledWith('gemini');
  });
});
