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
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand');

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
            mocks.saveNote(message.note).then(() => callback?.({ ok: true }),
              (error) => callback?.({ error: error.message }));
          } else if (message.action === 'save-ui-state') {
            mocks.saveUiState(message.state);
          } else if (message.action === 'get-ui-state') {
            callback({ sourceText: '', selectedLevel: 'A' });
          } else if (message.action === 'open-settings') {
            callback({ ok: true });
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
      if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
      else delete navigator.clipboard;
      if (execCommandDescriptor) Object.defineProperty(document, 'execCommand', execCommandDescriptor);
      else delete document.execCommand;
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

    test.each(['success', 'generation error', 'missing settings', 'settings error'])(
      'restores input focus after %s when generation started from the input', async (outcome) => {
        if (outcome === 'generation error') mocks.generate.mockRejectedValueOnce(new Error('Request failed.'));
        if (outcome === 'missing settings') mocks.loadSettings.mockResolvedValueOnce({ ...settings, apiKey: '' });
        if (outcome === 'settings error') mocks.loadSettings.mockRejectedValueOnce(new Error('Settings unavailable.'));
        input.focus();
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        expect(input.disabled).toBe(true);
        // jsdom does not blur disabled controls as Chrome does; reproduce that loss explicitly.
        document.body.tabIndex = -1;
        document.body.focus();
        expect(document.activeElement).not.toBe(input);

        await vi.waitFor(() => expect(input.disabled).toBe(false));
        expect(document.activeElement).toBe(input);
        if (outcome === 'success') expect(mocks.saveNote).toHaveBeenCalledTimes(1);
        else expect(mocks.saveNote).not.toHaveBeenCalled();
      }
    );

    test('does not focus the input when it was not focused before generation', async () => {
      const pending = deferred();
      mocks.generate.mockReturnValue(pending.promise);
      const otherControl = mode === 'sidepanel'
        ? document.getElementById('line2') : document.getElementById('tn-line2');
      otherControl.focus();
      generate.click();
      await vi.waitFor(() => expect(mocks.generate).toHaveBeenCalledTimes(1));
      pending.resolve(note);
      await vi.waitFor(() => expect(input.disabled).toBe(false));

      expect(document.activeElement).toBe(otherControl);
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
      test('opens settings through the service worker when the content script lacks openOptionsPage', () => {
        delete chrome.runtime.openOptionsPage;
        document.getElementById('tn-settings').click();
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'open-settings' }, expect.any(Function));
      });

      test.each(['get-settings', 'get-ui-state', 'get-notes', 'open-settings'])('shows a %s service-worker failure', async (action) => {
        const sendMessage = chrome.runtime.sendMessage.getMockImplementation();
        chrome.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action === action) callback({ error: 'Service worker request failed.' });
          else return sendMessage(message, callback);
        });
        if (action === 'get-settings') generate.click();
        else if (action === 'get-ui-state') showPanel({ action: 'show-panel' });
        else document.getElementById(action === 'get-notes' ? 'tn-export' : 'tn-settings').click();
        await vi.waitFor(() => expect(status.textContent).toBe('Service worker request failed.'));
        expect(status.classList.contains('error')).toBe(true);
        expect(generate.disabled).toBe(false);
      });

      test('saves on HTTP pages without crypto.randomUUID', async () => {
        const descriptor = Object.getOwnPropertyDescriptor(crypto, 'randomUUID');
        try {
          Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: undefined });
          generate.click();
          await vi.waitFor(() => expect(status.textContent).toBe('Done.'));
          expect(mocks.saveNote).toHaveBeenCalledWith(expect.objectContaining({ sourceText: '北京' }));
        } finally {
          if (descriptor) Object.defineProperty(crypto, 'randomUUID', descriptor);
          else delete crypto.randomUUID;
        }
      });

      test('waits for durable save confirmation before reporting success', async () => {
        const pending = deferred();
        mocks.saveNote.mockReturnValueOnce(pending.promise);
        generate.click();
        await vi.waitFor(() => expect(mocks.saveNote).toHaveBeenCalledTimes(1));
        expect(status.textContent).toBe('Generating...');
        expect(generate.disabled).toBe(true);
        pending.resolve();
        await vi.waitFor(() => expect(status.textContent).toBe('Done.'));
        expect(generate.disabled).toBe(false);
      });

      test('reports storage failure and keeps the generated text available to copy', async () => {
        mocks.saveNote.mockRejectedValueOnce(new Error('Storage quota exceeded.'));
        generate.click();
        await vi.waitFor(() => expect(status.textContent).toContain('Storage quota exceeded.'));
        expect(status.classList.contains('error')).toBe(true);
        expect(document.getElementById('tn-line2').value).toBe(note.line2);
        expect(document.getElementById('tn-line3').value).toBe(note.line3);
        expect(generate.disabled).toBe(false);
      });

      test.each(['disconnected', 'empty-response'])('reports a %s save acknowledgement', async (failure) => {
        const sendMessage = chrome.runtime.sendMessage.getMockImplementation();
        chrome.runtime.sendMessage.mockImplementation((message, callback) => {
          if (message.action !== 'save-note') return sendMessage(message, callback);
          if (failure === 'disconnected') chrome.runtime.lastError = { message: 'Extension disconnected.' };
          callback?.();
          delete chrome.runtime.lastError;
        });
        generate.click();
        await vi.waitFor(() => expect(status.classList.contains('error')).toBe(true));
        expect(status.textContent).not.toBe('Done.');
        expect(generate.disabled).toBe(false);
      });

      test.each(['tn-copy-l2', 'tn-copy-l3', 'tn-copy-all'])('%s copies on HTTP pages and restores focus', async (button) => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
        let copied;
        Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => {
          copied = document.activeElement.value;
          return true;
        }) });
        document.getElementById('tn-line2').value = note.line2;
        document.getElementById('tn-line3').value = note.line3;
        input.focus();
        input.setSelectionRange(0, 1);
        document.getElementById(button).click();
        await vi.waitFor(() => expect(status.textContent).toContain('Copied'));
        expect(copied).toBe(button === 'tn-copy-l2' ? note.line2 : button === 'tn-copy-l3' ? note.line3
          : `Input: 北京\nNote: ${note.line2}\nExplanation: ${note.line3}`);
        expect(document.activeElement).toBe(input);
        expect([input.selectionStart, input.selectionEnd]).toEqual([0, 1]);
        expect(document.querySelectorAll('textarea')).toHaveLength(3);
      });

      test.each(['tn-copy-l2', 'tn-copy-l3', 'tn-copy-all'])('%s reports clipboard denial without losing the note', async (button) => {
        Object.defineProperty(navigator, 'clipboard', { configurable: true,
          value: { writeText: vi.fn().mockRejectedValue(new Error('Permission denied.')) } });
        Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => false) });
        document.getElementById('tn-line2').value = note.line2;
        document.getElementById('tn-line3').value = note.line3;
        document.getElementById(button).click();
        await vi.waitFor(() => expect(status.textContent).toBe('Failed to copy. Select the text and copy it manually.'));
        expect(status.classList.contains('error')).toBe(true);
        expect(document.getElementById('tn-line2').value).toBe(note.line2);
        expect(document.querySelectorAll('textarea')).toHaveLength(3);
      });

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
