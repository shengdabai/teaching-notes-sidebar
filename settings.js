import { getProviderConfig, testLlmConnection } from './lib/llm-client.js';
import { loadSettings, saveSettings } from './lib/storage.js';
import { validateSettings } from './lib/validators.js';

let savedSettingsSnapshot = null;

function setStatus(message, isError = false) {
  const status = document.querySelector('#status');
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle('error', isError);
}

function getFormSettings() {
  return {
    provider: document.querySelector('#provider').value,
    apiKey: document.querySelector('#api-key').value.trim(),
    model: document.querySelector('#model').value,
    endpoint: document.querySelector('#endpoint').value.trim()
  };
}

function updateModelOptions(provider) {
  const config = getProviderConfig(provider);
  const modelSelect = document.querySelector('#model');

  if (provider === 'custom') {
    modelSelect.outerHTML = `<input id="model" name="model" type="text" placeholder="e.g. gpt-4o, claude-3-5-sonnet" autocomplete="off" />`;
  } else {
    const existingInput = document.querySelector('#model');
    if (existingInput && existingInput.tagName === 'INPUT') {
      existingInput.outerHTML = `<select id="model" name="model"></select>`;
    }
    const select = document.querySelector('#model');
    select.innerHTML = config.models.map((m) => `<option value="${m}">${m}</option>`).join('');
    if (config.defaultModel) {
      select.value = config.defaultModel;
    }
  }
}

function updateEndpointVisibility(provider) {
  const endpointGroup = document.querySelector('#endpoint-group');
  const config = getProviderConfig(provider);

  if (provider === 'gemini') {
    endpointGroup.style.display = 'none';
  } else {
    endpointGroup.style.display = '';
    const endpointInput = document.querySelector('#endpoint');
    if (provider === 'custom') {
      endpointInput.placeholder = 'https://api.example.com/v1/chat/completions';
      endpointInput.value = '';
    } else {
      endpointInput.placeholder = config.defaultEndpoint || '';
      endpointInput.value = '';
    }
  }
}

async function handleSave(event) {
  event.preventDefault();

  const settings = getFormSettings();
  if (!validateSettings(settings)) {
    setStatus('Please provide both API key and model.', true);
    return;
  }

  try {
    await saveSettings(settings);
    savedSettingsSnapshot = settings;
    setStatus('Settings saved.');
  } catch (error) {
    setStatus(error.message || 'Failed to save settings.', true);
  }
}

async function restoreSavedSettings() {
  const settings = await loadSettings();
  savedSettingsSnapshot = settings;
  document.querySelector('#provider').value = settings.provider || 'deepseek';
  document.querySelector('#api-key').value = settings.apiKey;
  document.querySelector('#endpoint').value = settings.endpoint || '';
  updateModelOptions(settings.provider || 'deepseek');
  updateEndpointVisibility(settings.provider || 'deepseek');
  if (settings.provider === 'custom') {
    document.querySelector('#model').value = settings.model || '';
  } else {
    document.querySelector('#model').value = settings.model;
  }
  setStatus('Changes discarded.');
}

async function handleTestConnection() {
  const settings = getFormSettings();
  if (!validateSettings(settings)) {
    setStatus('Please provide both API key and model.', true);
    return;
  }

  setStatus('Testing connection...');

  try {
    await testLlmConnection(settings);
    setStatus('Connection successful.');
  } catch (error) {
    setStatus(error.message || 'Connection failed.', true);
  }
}

export async function initSettingsPage() {
  const settings = await loadSettings();
  savedSettingsSnapshot = settings;
  document.querySelector('#provider').value = settings.provider || 'deepseek';
  document.querySelector('#api-key').value = settings.apiKey;
  document.querySelector('#endpoint').value = settings.endpoint || '';
  updateModelOptions(settings.provider || 'deepseek');
  updateEndpointVisibility(settings.provider || 'deepseek');
  if (settings.provider === 'custom') {
    document.querySelector('#model').value = settings.model || '';
  } else {
    document.querySelector('#model').value = settings.model;
  }

  document.querySelector('#settings-form').addEventListener('submit', handleSave);
  document.querySelector('#test-connection').addEventListener('click', handleTestConnection);
  document.querySelector('#cancel-button').addEventListener('click', restoreSavedSettings);
  document.querySelector('#provider').addEventListener('change', (event) => {
    updateModelOptions(event.target.value);
    updateEndpointVisibility(event.target.value);
  });
}

if (document.querySelector('#settings-form')) {
  initSettingsPage().catch((error) => {
    setStatus(error.message || 'Failed to initialize settings.', true);
  });
}
