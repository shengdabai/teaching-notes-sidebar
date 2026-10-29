import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadSettings: vi.fn(),
  generate: vi.fn(),
  saveNote: vi.fn(),
  saveUiState: vi.fn()
}));

vi.mock('../lib/storage.js', () => ({
  loadSettings: mocks.loadSettings,
  loadUiState: vi.fn().mockResolvedValue({ sourceText: '', selectedLevel: 'A' }),
  saveUiState: mocks.saveUiState,
  saveNote: mocks.saveNote,
  loadNotes: vi.fn().mockResolvedValue([])
}));
vi.mock('../lib/llm-client.js', () => ({ generateTeachingNote: mocks.generate }));

const settings = { provider: 'deepseek', apiKey: 'test-key', model: 'deepseek-chat' };
const note = { line2: '北京Běijīng', line3: 'Beijing.' };
const floatingScript = readFileSync('injected-panel.js', 'utf8');
const sidepanelHtml = readFileSync('sidepanel.html', 'utf8');

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

for (const mode of ['sidepanel', 'floating']) {
  describe(`${mode} generation workflow`, () => {
    let input, level, generate, reset, status;
    let showPanel;

    beforeEach(async () => {
      vi.resetModules();
      vi.clearAllMocks();
      Object.values(mocks).forEach((mock) => mock.mockReset());
      document.head.innerHTML = '';
      document.body.innerHTML = '';
      mocks.loadSettings.mockResolvedValue(settings);
      mocks.generate.mockResolvedValue(note);
      mocks.saveNote.mockResolvedValue();
      mocks.saveUiState.mockResolvedValue();
      global.chrome = { runtime: {
        onMessage: { addListener: vi.fn((listener) => { showPanel = listener; }) },
        sendMessage: vi.fn((message, callback) => {
          if (message.action === 'get-settings') {
            mocks.loadSettings().then(callback, (error) => {
              chrome.runtime.lastError = { message: error.message };
              callback();
              delete chrome.runtime.lastError;
            });
          } else if (message.action === 'generate') {
            mocks.generate(message).then(callback, (error) => callback({ error: error.message }));
          } else if (message.action === 'save-note') {
            mocks.saveNote(message.note);
          } else if (message.action === 'save-ui-state') {
            mocks.saveUiState(message.state);
          } else if (message.action === 'get-ui-state') {
            callback({ sourceText: '', selectedLevel: 'A' });
          }
        }),
        openOptionsPage: vi.fn()
      } };

      if (mode === 'sidepanel') {
        // Import before mounting to avoid the module's automatic initialization.
        const { initSidePanel } = await import('../sidepanel.js');
        document.body.innerHTML = new DOMParser().parseFromString(sidepanelHtml, 'text/html').body.innerHTML;
        await initSidePanel();
        [input, level, generate, reset, status] = ['source-text', 'level-select', 'generate-button', 'reset-button', 'status'].map((id) => document.getElementById(id));
      } else {
        window.eval(floatingScript);
        showPanel({ action: 'show-panel' });
        await Promise.resolve();
        [input, level, generate, reset, status] = ['tn-source', 'tn-level', 'tn-gen', 'tn-reset', 'tn-status'].map((id) => document.getElementById(id));
      }
      mocks.loadSettings.mockClear();
      input.value = '北京';
      level.value = 'B';
      level.dispatchEvent(new Event('change'));
      mocks.saveUiState.mockClear();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('locks before settings load and sends only one request for rapid Enter presses', async () => {
      const pending = deferred();
      mocks.loadSettings.mockReturnValue(pending.promise);
      generate.click();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      const wasDisabled = generate.disabled;
      pending.resolve(settings);
      await vi.waitFor(() => expect(mocks.saveNote).toHaveBeenCalled());
      expect(mocks.loadSettings).toHaveBeenCalledTimes(1);
      expect(mocks.generate).toHaveBeenCalledTimes(1);
      expect(mocks.saveNote).toHaveBeenCalledTimes(1);
      expect(wasDisabled).toBe(true);
    });

    test('keeps source, level and reset stable until generation completes', async () => {
      const pending = deferred();
      mocks.generate.mockReturnValue(pending.promise);
      generate.click();
      await vi.waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(1));
      const disabled = [input.disabled, level.disabled, reset.disabled];
      reset.click();
      pending.resolve(note);
      await vi.waitFor(() => expect(mocks.saveNote).toHaveBeenCalled());
      expect(mocks.saveNote).toHaveBeenCalledWith(expect.objectContaining({
        sourceText: '北京', level: 'B', ...note
      }));
      expect(input.value).toBe('北京');
      expect(level.value).toBe('B');
      expect(disabled).toEqual([true, true, true]);
      expect([input.disabled, level.disabled, reset.disabled, generate.disabled]).toEqual([false, false, false, false]);
    });

    test('releases the controls after missing settings so the user can retry', async () => {
      mocks.loadSettings.mockResolvedValueOnce({ ...settings, apiKey: '' });
      generate.click();
      await vi.waitFor(() => expect(status.textContent).toContain('configure AI settings'));
      expect(mocks.generate).not.toHaveBeenCalled();
      expect([input.disabled, level.disabled, reset.disabled, generate.disabled]).toEqual([false, false, false, false]);
      generate.click();
      await vi.waitFor(() => expect(mocks.saveNote).toHaveBeenCalledTimes(1));
    });

    test('reports generation errors and allows a retry without saving a failed note', async () => {
      mocks.generate.mockRejectedValueOnce(new Error('Request timed out.'));
      generate.click();
      await vi.waitFor(() => expect(status.textContent).toBe('Request timed out.'));
      expect(status.classList.contains('error')).toBe(true);
      expect(mocks.saveNote).not.toHaveBeenCalled();
      expect([input.disabled, level.disabled, reset.disabled, generate.disabled]).toEqual([false, false, false, false]);
      generate.click();
      await vi.waitFor(() => expect(mocks.saveNote).toHaveBeenCalledTimes(1));
    });

    test('does not generate on IME confirmation or Shift+Enter', async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true }));
      await Promise.resolve();
      expect(mocks.loadSettings).not.toHaveBeenCalled();
      expect(mocks.generate).not.toHaveBeenCalled();
    });


    test('reports settings-load failures and releases controls for retry', async () => {
      mocks.loadSettings.mockRejectedValueOnce(new Error('Settings unavailable.'));
      generate.click();
      await vi.waitFor(() => expect(status.textContent).toBe('Settings unavailable.'));
      expect(status.classList.contains('error')).toBe(true);
      expect(mocks.generate).not.toHaveBeenCalled();
      expect([input.disabled, level.disabled, reset.disabled, generate.disabled]).toEqual([false, false, false, false]);
      generate.click();
      await vi.waitFor(() => expect(mocks.saveNote).toHaveBeenCalledTimes(1));
    });

    test('does not generate on legacy IME keycode 229 or between composition events', async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('compositionstart'));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event('compositionend'));
      await Promise.resolve();
      expect(mocks.loadSettings).not.toHaveBeenCalled();
      expect(mocks.generate).not.toHaveBeenCalled();
    });

    if (mode === 'floating') {
      test('reopening the panel during generation preserves the in-flight input and level', async () => {
        const pending = deferred();
        mocks.generate.mockReturnValue(pending.promise);
        generate.click();
        await vi.waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(1));
        showPanel({ action: 'hide-panel' });
        showPanel({ action: 'show-panel' });
        await Promise.resolve();
        const currentInput = input.value;
        const currentLevel = level.value;
        pending.resolve(note);
        await vi.waitFor(() => expect(mocks.saveNote).toHaveBeenCalledTimes(1));
        expect(currentInput).toBe('北京');
        expect(currentLevel).toBe('B');
        expect(mocks.saveNote).toHaveBeenCalledWith(expect.objectContaining({ sourceText: '北京', level: 'B' }));
      });
    }

    test('persists a level-only change immediately', () => {
      level.value = 'C';
      level.dispatchEvent(new Event('change'));
      expect(mocks.saveUiState).toHaveBeenCalledWith({ sourceText: '北京', selectedLevel: 'C' });
    });
  });
}
