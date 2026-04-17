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
  beforeEach(() => {
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
});
