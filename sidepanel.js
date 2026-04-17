import { copyText } from './lib/clipboard.js';
import { generateTeachingNote } from './lib/llm-client.js';
import { buildPrompt } from './lib/prompt-builder.js';
import {
  loadNotes,
  loadSettings,
  loadUiState,
  saveNote,
  saveUiState
} from './lib/storage.js';
import { validateChineseInput, validateLevel } from './lib/validators.js';

let selectedLevel = 'A';
let isGenerating = false;
let uiStateTimer = null;
let isComposing = false;

const elements = {};

function cacheElements() {
  elements.sourceText = document.querySelector('#source-text');
  elements.line2 = document.querySelector('#line2');
  elements.line3 = document.querySelector('#line3');
  elements.status = document.querySelector('#status');
  elements.generateButton = document.querySelector('#generate-button');
  elements.levelSelect = document.querySelector('#level-select');
}

function setStatus(message, isError = false) {
  if (!elements.status) {
    return;
  }

  elements.status.textContent = message;
  elements.status.classList.toggle('error', isError);
}

function renderLevel() {
  if (elements.levelSelect) {
    elements.levelSelect.value = selectedLevel;
  }
}

function getCurrentUiState() {
  return {
    sourceText: elements.sourceText.value,
    selectedLevel
  };
}

function debouncedPersistUiState() {
  clearTimeout(uiStateTimer);
  uiStateTimer = setTimeout(() => {
    saveUiState(getCurrentUiState()).catch((error) => {
      setStatus(error.message || 'Failed to save UI state.', true);
    });
  }, 300);
}

async function persistUiState() {
  await saveUiState(getCurrentUiState());
}

function setGenerating(busy) {
  isGenerating = busy;
  if (elements.generateButton) {
    elements.generateButton.disabled = busy;
    elements.generateButton.title = busy ? 'Generating...' : 'Press Enter to generate';
  }
}

async function onGenerate() {
  if (isGenerating) {
    return;
  }

  const trimmedSourceText = elements.sourceText.value.trim();

  if (!validateChineseInput(trimmedSourceText)) {
    setStatus('Please enter Chinese text first.', true);
    return;
  }

  const settings = await loadSettings();
  if (!settings.apiKey || !settings.model) {
    setStatus('Please configure AI settings first.', true);
    return;
  }

  setGenerating(true);
  setStatus('Generating...');

  try {
    const prompt = buildPrompt({
      sourceText: trimmedSourceText,
      level: selectedLevel
    });
    const result = await generateTeachingNote({
      provider: settings.provider || 'deepseek',
      apiKey: settings.apiKey,
      model: settings.model,
      prompt,
      endpoint: settings.endpoint
    });

    renderLevel();
    elements.line2.value = result.line2;
    elements.line3.value = result.line3;

    // Auto-save the note (kept in storage, not displayed in UI)
    await saveNote({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      sourceText: trimmedSourceText,
      level: selectedLevel,
      line2: result.line2,
      line3: result.line3
    });

    setStatus('Note generated and saved.');
  } catch (error) {
    setStatus(error.message || 'Failed to generate note.', true);
  } finally {
    setGenerating(false);
  }
}

function onReset() {
  selectedLevel = 'A';
  elements.sourceText.value = '';
  elements.line2.value = '';
  elements.line3.value = '';
  renderLevel();
  setStatus('Reset complete.');
  persistUiState().catch((error) => {
    setStatus(error.message || 'Failed to save UI state.', true);
  });
}

async function onExportMd() {
  const notes = await loadNotes();
  if (!notes.length) {
    setStatus('No notes to export.', true);
    return;
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // Summary statistics for analysis
  const levelCounts = { A: 0, B: 0, C: 0 };
  for (const note of notes) {
    if (levelCounts[note.level] !== undefined) levelCounts[note.level]++;
  }
  const uniqueSources = new Set(notes.map(n => n.sourceText)).size;
  const firstNote = new Date(notes[0].createdAt);
  const lastNote = new Date(notes[notes.length - 1].createdAt);

  const lines = [
    '# Teaching Notes',
    '',
    `**Total:** ${notes.length} notes | **Unique phrases:** ${uniqueSources}`,
    `**Levels:** A=${levelCounts.A} B=${levelCounts.B} C=${levelCounts.C}`,
    `**Date range:** ${firstNote.toLocaleString()} — ${lastNote.toLocaleString()}`,
    `**Exported:** ${now.toLocaleString()}`,
    '',
    '---',
    ''
  ];

  for (const note of notes) {
    lines.push(`## ${note.sourceText}`);
    lines.push('');
    lines.push(`**Level:** ${note.level}`);
    lines.push('');
    lines.push(`**Note:** ${note.line2}`);
    lines.push('');
    lines.push(`**Explanation:** ${note.line3}`);
    lines.push('');
    lines.push(`*Created: ${new Date(note.createdAt).toLocaleString()}*  |  *ID: ${note.id}]*`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `teaching-notes-${timestamp}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setStatus(`Exported ${notes.length} note(s) as markdown.`);
}

function bindEvents() {
  elements.levelSelect?.addEventListener('change', () => {
    selectedLevel = elements.levelSelect.value;
    renderLevel();
    persistUiState().catch((error) => {
      setStatus(error.message || 'Failed to save UI state.', true);
    });
  });

  elements.sourceText?.addEventListener('input', () => {
    debouncedPersistUiState();
  });

  elements.sourceText?.addEventListener('compositionstart', () => {
    isComposing = true;
  });

  elements.sourceText?.addEventListener('compositionend', () => {
    isComposing = false;
  });

  // Enter key triggers generation
  elements.sourceText?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !isComposing) {
      event.preventDefault();
      onGenerate();
    }
  });

  elements.generateButton?.addEventListener('click', onGenerate);
  elements.resetButton?.addEventListener('click', onReset);
  elements.openSettings?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Copy individual Note (line2)
  elements.copyLine2?.addEventListener('click', () => {
    const line2 = elements.line2.value.trim();
    if (!line2) {
      setStatus('Nothing to copy.', true);
      return;
    }
    copyText(line2)
      .then(() => setStatus('Note copied.'))
      .catch(() => setStatus('Failed to copy.', true));
  });

  // Copy individual Explanation (line3)
  elements.copyLine3?.addEventListener('click', () => {
    const line3 = elements.line3.value.trim();
    if (!line3) {
      setStatus('Nothing to copy.', true);
      return;
    }
    copyText(line3)
      .then(() => setStatus('Explanation copied.'))
      .catch(() => setStatus('Failed to copy.', true));
  });

  // Copy All
  elements.copyAll?.addEventListener('click', () => {
    const sourceText = elements.sourceText.value.trim();
    const line2 = elements.line2.value.trim();
    const line3 = elements.line3.value.trim();
    if (!line2 && !line3) {
      setStatus('Nothing to copy yet.', true);
      return;
    }
    const parts = [];
    if (sourceText) parts.push(`Input: ${sourceText}`);
    if (line2) parts.push(`Note: ${line2}`);
    if (line3) parts.push(`Explanation: ${line3}`);
    copyText(parts.join('\n'))
      .then(() => setStatus('Copied all.'))
      .catch(() => setStatus('Failed to copy.', true));
  });

  // Export as Markdown
  elements.exportNotes?.addEventListener('click', onExportMd);
}

export async function initSidePanel() {
  cacheElements();
  elements.resetButton = document.querySelector('#reset-button');
  elements.openSettings = document.querySelector('#open-settings');
  elements.copyAll = document.querySelector('#copy-all');
  elements.copyLine2 = document.querySelector('#copy-line2');
  elements.copyLine3 = document.querySelector('#copy-line3');
  elements.exportNotes = document.querySelector('#export-notes');

  const uiState = await loadUiState();
  elements.sourceText.value = uiState.sourceText || '';
  selectedLevel = validateLevel(uiState.selectedLevel) ? uiState.selectedLevel : 'A';
  renderLevel();
  bindEvents();

  const settings = await loadSettings();
  if (!settings.apiKey || !settings.model) {
    setStatus('Please configure AI settings first.', true);
    await chrome.runtime.openOptionsPage();
  }
}

if (document.querySelector('#source-text')) {
  initSidePanel().catch((error) => {
    setStatus(error.message || 'Failed to initialize side panel.', true);
  });
}
