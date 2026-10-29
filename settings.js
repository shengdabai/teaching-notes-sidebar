import { getProviderConfig, testLlmConnection } from './lib/llm-client.js';
import { loadSettings, saveSettings } from './lib/storage.js';
import { validateSettings } from './lib/validators.js';

let isBusy = false;

function setBusy(busy) {
  isBusy = busy;
  document.querySelectorAll('#settings-form input, #settings-form select, #settings-form button')
    .forEach((control) => { control.disabled = busy; });
}

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
    } else {
      endpointInput.placeholder = config.defaultEndpoint || '';
    }
  }
}

async function handleSave(event) {
  event.preventDefault();
  if (isBusy) return;

  const settings = getFormSettings();
  if (!validateSettings(settings)) {
    setStatus('Provide an API key, a model, and a valid endpoint (required for Custom). Use HTTPS or local loopback HTTP.', true);
    return;
  }

  setBusy(true);
  try {
    await saveSettings(settings);
    setStatus('Settings saved.');
  } catch (error) {
    setStatus(error.message || 'Failed to save settings.', true);
  } finally {
    setBusy(false);
  }
}

function applySettings(settings) {
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
}

async function restoreSavedSettings() {
  if (isBusy) return;
  setBusy(true);
  try {
    applySettings(await loadSettings());
    setStatus('Changes discarded.');
  } catch (error) {
    setStatus(error.message || 'Failed to restore settings.', true);
  } finally {
    setBusy(false);
  }
}

async function handleTestConnection() {
  if (isBusy) return;
  const settings = getFormSettings();
  if (!validateSettings(settings)) {
    setStatus('Provide an API key, a model, and a valid endpoint (required for Custom). Use HTTPS or local loopback HTTP.', true);
    return;
  }

  setBusy(true);
  setStatus('Testing connection...');

  try {
    await testLlmConnection(settings);
    setStatus('Connection successful.');
  } catch (error) {
    setStatus(error.message || 'Connection failed.', true);
  } finally {
    setBusy(false);
  }
}

export async function initSettingsPage() {
  setBusy(true);
  try {
    applySettings(await loadSettings());
  } finally {
    setBusy(false);
  }

  document.querySelector('#settings-form').addEventListener('submit', handleSave);
  document.querySelector('#test-connection').addEventListener('click', handleTestConnection);
  document.querySelector('#cancel-button').addEventListener('click', restoreSavedSettings);
  document.querySelector('#provider').addEventListener('change', (event) => {
    document.querySelector('#endpoint').value = '';
    document.querySelector('#api-key').value = '';
    updateModelOptions(event.target.value);
    updateEndpointVisibility(event.target.value);
    setStatus('Provider changed. Enter an API key for this provider.');
  });
}

if (document.querySelector('#settings-form')) {
  initSettingsPage().catch((error) => {
    setStatus(error.message || 'Failed to initialize settings.', true);
  });
}
