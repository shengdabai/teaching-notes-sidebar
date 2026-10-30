import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockGenerateTeachingNote = vi.fn().mockResolvedValue({
  line2: '经济jīngjì 发展fāzhǎn',
  line3: 'Economic development.'
});
const mockLoadSettings = vi.fn().mockResolvedValue({
  provider: 'deepseek',
  apiKey: 'key',
  model: 'deepseek-chat',
  endpoint: ''
});
const mockSaveNote = vi.fn().mockResolvedValue();
const mockLoadNotes = vi.fn().mockResolvedValue([]);
const mockSaveUiState = vi.fn().mockResolvedValue();
const mockLoadUiState = vi.fn().mockResolvedValue({
  sourceText: '',
  selectedLevel: 'A'
});
const mockBuildPrompt = vi.fn().mockReturnValue('prompt');

vi.mock('../lib/llm-client.js', () => ({
  generateTeachingNote: mockGenerateTeachingNote
}));

vi.mock('../lib/storage.js', () => ({
  loadSettings: mockLoadSettings,
  saveNote: mockSaveNote,
  loadNotes: mockLoadNotes,
  saveUiState: mockSaveUiState,
  loadUiState: mockLoadUiState
}));

vi.mock('../lib/prompt-builder.js', () => ({
  buildPrompt: mockBuildPrompt
}));

describe('side panel interactions', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    mockGenerateTeachingNote.mockResolvedValue({
      line2: '经济jīngjì 发展fāzhǎn',
      line3: 'Economic development.'
    });
    mockLoadSettings.mockResolvedValue({
      provider: 'deepseek',
      apiKey: 'key',
      model: 'deepseek-chat',
      endpoint: ''
    });
    mockLoadNotes.mockResolvedValue([]);
    mockLoadUiState.mockResolvedValue({
      sourceText: '',
      selectedLevel: 'A'
    });

    global.chrome = {
      runtime: {
        openOptionsPage: vi.fn()
      }
    };

    // Import without the page fixture so the module's automatic startup does
    // not race with each test's explicit initSidePanel() call.
    document.body.innerHTML = '';
    await import('../sidepanel.js');

    document.body.innerHTML = `
      <textarea id="source-text"></textarea>
      <button id="generate-button" type="button">Generate</button>
      <select id="level-select">
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
      </select>
      <textarea id="line2"></textarea>
      <textarea id="line3"></textarea>
      <button id="copy-line2" type="button">Copy Note</button>
      <button id="copy-line3" type="button">Copy Explanation</button>
      <button id="copy-all" type="button">Copy All</button>
      <button id="export-notes" type="button">Export MD</button>
      <button id="reset-button" type="button">Reset</button>
      <button id="open-settings" type="button">Settings</button>
      <div id="status"></div>
    `;

    global.navigator.clipboard = {
      writeText: vi.fn().mockResolvedValue()
    };
  });

  test('updates level when the level select changes', async () => {
    const { initSidePanel } = await import('../sidepanel.js');

    await initSidePanel();
    document.querySelector('#level-select').value = 'B';
    document.querySelector('#level-select').dispatchEvent(new Event('change', { bubbles: true }));

    expect(document.querySelector('#level-select').value).toBe('B');
  });

  test('generates note content and auto-saves', async () => {
    const { initSidePanel } = await import('../sidepanel.js');
    const { buildPrompt } = await import('../lib/prompt-builder.js');

    await initSidePanel();

    document.querySelector('#source-text').value = '经济发展';
    document.querySelector('#level-select').value = 'B';
    document.querySelector('#level-select').dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#generate-button').click();

    await vi.waitFor(() => {
      expect(buildPrompt).toHaveBeenCalledWith({
        sourceText: '经济发展',
        level: 'B'
      });
      expect(document.querySelector('#line2').value).toBe('经济jīngjì 发展fāzhǎn');
      expect(document.querySelector('#line3').value).toBe('Economic development.');
      expect(mockSaveNote).toHaveBeenCalled();
    });
  });

  test('enter key triggers generation', async () => {
    const { initSidePanel } = await import('../sidepanel.js');

    await initSidePanel();

    document.querySelector('#source-text').value = '经济发展';
    document.querySelector('#source-text').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => {
      expect(mockGenerateTeachingNote).toHaveBeenCalled();
    });
  });

  test.each([
    ['KeyboardEvent.isComposing', { isComposing: true }],
    ['legacy IME keyCode 229', { keyCode: 229 }]
  ])('does not generate when Enter confirms IME composition (%s)', async (_label, imeInit) => {
    const { initSidePanel } = await import('../sidepanel.js');
    await initSidePanel();
    const source = document.querySelector('#source-text');
    source.value = '经济发展';

    // Some IMEs report composition only on the event, without compositionstart.
    const imeEnter = new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true, cancelable: true, ...imeInit
    });
    source.dispatchEvent(imeEnter);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(imeEnter.defaultPrevented).toBe(false);
    expect(mockGenerateTeachingNote).not.toHaveBeenCalled();
    expect(document.querySelector('#generate-button').disabled).toBe(false);

    source.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      expect(mockGenerateTeachingNote).toHaveBeenCalledTimes(1);
    });
  });

  test('locks generation before settings resolve and ignores repeated Enter', async () => {
    const { initSidePanel } = await import('../sidepanel.js');
    await initSidePanel();
    mockLoadSettings.mockClear();
    let resolveSettings;
    mockLoadSettings.mockReturnValueOnce(new Promise((resolve) => {
      resolveSettings = resolve;
    }));

    const source = document.querySelector('#source-text');
    source.value = '经济发展';
    document.querySelector('#generate-button').click();
    source.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true, cancelable: true
    }));

    try {
      expect(document.querySelector('#generate-button').disabled).toBe(true);
      expect(mockLoadSettings).toHaveBeenCalledTimes(1);
    } finally {
      resolveSettings({ provider: 'deepseek', apiKey: 'key', model: 'deepseek-chat' });
    }
    await vi.waitFor(() => {
      expect(mockGenerateTeachingNote).toHaveBeenCalledTimes(1);
      expect(mockSaveNote).toHaveBeenCalledTimes(1);
      expect(document.querySelector('#generate-button').disabled).toBe(false);
    });
  });

  test('keeps input, level and reset locked until the note is saved', async () => {
    const { initSidePanel } = await import('../sidepanel.js');
    await initSidePanel();
    let resolveSave;
    mockSaveNote.mockReturnValueOnce(new Promise((resolve) => {
      resolveSave = resolve;
    }));
    const source = document.querySelector('#source-text');
    const level = document.querySelector('#level-select');
    const reset = document.querySelector('#reset-button');
    source.value = '经济发展';
    source.focus();
    level.value = 'B';
    level.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('#generate-button').click();

    await vi.waitFor(() => expect(mockSaveNote).toHaveBeenCalledTimes(1));
    try {
      expect(source.readOnly).toBe(true);
      expect(document.activeElement).toBe(source);
      expect(level.disabled).toBe(true);
      expect(reset.disabled).toBe(true);
      reset.click();
      expect(source.value).toBe('经济发展');
      expect(level.value).toBe('B');
      expect(mockSaveNote).toHaveBeenCalledWith(expect.objectContaining({
        sourceText: '经济发展', level: 'B'
      }));
    } finally {
      resolveSave();
    }
    await vi.waitFor(() => {
      expect(source.readOnly).toBe(false);
      expect(level.disabled).toBe(false);
      expect(reset.disabled).toBe(false);
    });
  });

  test('uses the submitted level throughout asynchronous generation', async () => {
    const { initSidePanel } = await import('../sidepanel.js');
    await initSidePanel();
    let resolveSettings;
    mockLoadSettings.mockReturnValueOnce(new Promise((resolve) => {
      resolveSettings = resolve;
    }));
    document.querySelector('#source-text').value = '经济发展';
    document.querySelector('#generate-button').click();
    // Synthetic changes can still fire on a disabled select.
    const level = document.querySelector('#level-select');
    level.value = 'C';
    level.dispatchEvent(new Event('change', { bubbles: true }));
    resolveSettings({ provider: 'deepseek', apiKey: 'key', model: 'deepseek-chat' });

    await vi.waitFor(() => {
      expect(mockBuildPrompt).toHaveBeenCalledWith({ sourceText: '经济发展', level: 'A' });
      expect(mockGenerateTeachingNote).toHaveBeenCalledWith(expect.objectContaining({ level: 'A' }));
      expect(mockSaveNote).toHaveBeenCalledWith(expect.objectContaining({ level: 'A' }));
    });
  });

  test('shows settings read errors and releases generation controls', async () => {
    const { initSidePanel } = await import('../sidepanel.js');
    await initSidePanel();
    mockLoadSettings.mockRejectedValueOnce(new Error('Settings storage unavailable.'));
    document.querySelector('#source-text').value = '经济发展';
    document.querySelector('#generate-button').click();

    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toBe('Settings storage unavailable.');
      expect(document.querySelector('#status').classList.contains('error')).toBe(true);
      expect(document.querySelector('#generate-button').disabled).toBe(false);
      expect(mockGenerateTeachingNote).not.toHaveBeenCalled();
    });
  });

  test('releases controls when settings are incomplete', async () => {
    const { initSidePanel } = await import('../sidepanel.js');
    await initSidePanel();
    mockLoadSettings.mockResolvedValueOnce({ apiKey: '', model: 'deepseek-chat' });
    document.querySelector('#source-text').value = '经济发展';
    document.querySelector('#generate-button').click();

    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toContain('configure AI settings');
      expect(document.querySelector('#generate-button').disabled).toBe(false);
      expect(document.querySelector('#source-text').readOnly).toBe(false);
      expect(document.querySelector('#level-select').disabled).toBe(false);
      expect(document.querySelector('#reset-button').disabled).toBe(false);
      expect(mockGenerateTeachingNote).not.toHaveBeenCalled();
    });
  });

  test('releases controls and preserves input when generation fails', async () => {
    const { initSidePanel } = await import('../sidepanel.js');
    await initSidePanel();
    mockGenerateTeachingNote.mockRejectedValueOnce(new Error('Request failed.'));
    document.querySelector('#source-text').value = '经济发展';
    document.querySelector('#generate-button').click();

    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toBe('Request failed.');
      expect(document.querySelector('#source-text').value).toBe('经济发展');
      expect(document.querySelector('#source-text').readOnly).toBe(false);
      for (const id of ['generate-button', 'level-select', 'reset-button']) {
        expect(document.querySelector(`#${id}`).disabled).toBe(false);
      }
      expect(mockSaveNote).not.toHaveBeenCalled();
    });
  });

  test('enter key does not clear input', async () => {
    const { initSidePanel } = await import('../sidepanel.js');

    await initSidePanel();

    document.querySelector('#source-text').value = '经济发展';
    document.querySelector('#source-text').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );

    await vi.waitFor(() => {
      expect(document.querySelector('#source-text').value).toBe('经济发展');
    });
  });

  test('rejects non-Chinese input before generation', async () => {
    const { initSidePanel } = await import('../sidepanel.js');

    await initSidePanel();

    document.querySelector('#source-text').value = 'economic development';
    document.querySelector('#generate-button').click();

    await vi.waitFor(() => {
      expect(mockGenerateTeachingNote).not.toHaveBeenCalled();
      expect(document.querySelector('#status').textContent).toContain('Please enter Chinese text first.');
    });
  });

  test('copy note copies line2 only', async () => {
    const { initSidePanel } = await import('../sidepanel.js');

    await initSidePanel();
    document.querySelector('#line2').value = '经济jīngjì 发展fāzhǎn';

    document.querySelector('#copy-line2').click();

    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('经济jīngjì 发展fāzhǎn');
    });
  });

  test('copy explanation copies line3 only', async () => {
    const { initSidePanel } = await import('../sidepanel.js');

    await initSidePanel();
    document.querySelector('#line3').value = 'Economic development.';

    document.querySelector('#copy-line3').click();

    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Economic development.');
    });
  });

  test('copy all includes input, note and explanation', async () => {
    const { initSidePanel } = await import('../sidepanel.js');

    await initSidePanel();
    document.querySelector('#source-text').value = '经济发展';
    document.querySelector('#line2').value = '经济jīngjì 发展fāzhǎn';
    document.querySelector('#line3').value = 'Economic development.';

    document.querySelector('#copy-all').click();

    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'Input: 经济发展\nNote: 经济jīngjì 发展fāzhǎn\nExplanation: Economic development.'
      );
    });
  });

  test('opens settings when api key is missing', async () => {
    const { initSidePanel } = await import('../sidepanel.js');
    mockLoadSettings.mockResolvedValueOnce({
      provider: 'deepseek',
      apiKey: '',
      model: 'deepseek-chat',
      endpoint: ''
    });

    await initSidePanel();

    await vi.waitFor(() => {
      expect(chrome.runtime.openOptionsPage).toHaveBeenCalled();
      expect(document.querySelector('#status').textContent).toContain('configure AI settings');
    });
  });

  test('restores saved ui state on init', async () => {
    const { initSidePanel } = await import('../sidepanel.js');
    mockLoadUiState.mockResolvedValueOnce({
      sourceText: '你叫什么名字',
      selectedLevel: 'C'
    });

    await initSidePanel();

    expect(document.querySelector('#source-text').value).toBe('你叫什么名字');
    expect(document.querySelector('#level-select').value).toBe('C');
  });

  test('persists ui state when input or level changes', async () => {
    const { initSidePanel } = await import('../sidepanel.js');

    await initSidePanel();
    document.querySelector('#source-text').value = '经济发展';
    document.querySelector('#source-text').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#level-select').value = 'B';
    document.querySelector('#level-select').dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => {
      expect(mockSaveUiState).toHaveBeenCalledWith({
        sourceText: '经济发展',
        selectedLevel: 'B'
      });
    });
  });

  test('copy all with empty content shows error', async () => {
    const { initSidePanel } = await import('../sidepanel.js');

    await initSidePanel();
    document.querySelector('#copy-all').click();

    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
      expect(document.querySelector('#status').textContent).toContain('Nothing to copy');
    });
  });

  test('shows storage failures when exporting notes', async () => {
    const { initSidePanel } = await import('../sidepanel.js');
    await initSidePanel();
    mockLoadNotes.mockRejectedValueOnce(new Error('Notes storage unavailable.'));
    document.querySelector('#export-notes').click();

    await vi.waitFor(() => {
      expect(document.querySelector('#status').textContent).toBe('Notes storage unavailable.');
      expect(document.querySelector('#status').classList.contains('error')).toBe(true);
    });
  });
});
