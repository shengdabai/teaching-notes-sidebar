# Chinese Teaching Note Side Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Manifest V3 browser extension with a Chrome side panel that generates editable Chinese teaching notes using Gemini, supports A/B/C levels, local settings, drafts, copy actions, and Markdown export.

**Architecture:** Use plain HTML/CSS/JavaScript for the extension UI, with small focused modules under `lib/` for storage, prompt building, Gemini requests, parsing, clipboard, and Markdown generation. Use `vitest` plus `jsdom` for unit and DOM tests so behavior is verified before wiring the UI together.

**Tech Stack:** Chrome Extension Manifest V3, side panel API, vanilla JavaScript, HTML, CSS, npm, Vitest, JSDOM

---

### Task 1: Bootstrap the project and testing harness

**Files:**
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/package.json`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/vitest.config.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/tests/smoke.test.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/manifest.json`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/background.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/README.md`

- [ ] **Step 1: Write the failing smoke test**

```js
import { describe, expect, test } from 'vitest';
import manifest from '../manifest.json' assert { type: 'json' };

describe('extension manifest', () => {
  test('declares MV3 side panel extension basics', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.permissions).toContain('storage');
    expect(manifest.side_panel.default_path).toBe('sidepanel.html');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/smoke.test.js`
Expected: FAIL because `package.json`, `vitest`, and `manifest.json` do not exist yet.

- [ ] **Step 3: Write minimal project bootstrap**

```json
{
  "name": "chinese-teaching-note-sidepanel",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "jsdom": "^26.0.0",
    "vitest": "^3.2.4"
  }
}
```

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom'
  }
});
```

```json
{
  "manifest_version": 3,
  "name": "Chinese Teaching Note Builder",
  "version": "1.0.0",
  "description": "Generate Chinese teaching notes in a side panel using Gemini.",
  "permissions": ["storage", "sidePanel"],
  "host_permissions": ["https://generativelanguage.googleapis.com/*"],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Open Teaching Note Builder"
  },
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "options_page": "settings.html"
}
```

```js
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm install && npm test -- tests/smoke.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json vitest.config.js tests/smoke.test.js manifest.json background.js README.md
git commit -m "chore: bootstrap extension project"
```

### Task 2: Add settings and storage primitives

**Files:**
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/lib/storage.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/lib/validators.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/tests/storage.test.js`

- [ ] **Step 1: Write the failing storage test**

```js
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  defaultSettings,
  loadSettings,
  saveSettings,
  saveDraft,
  loadDrafts
} from '../lib/storage.js';

describe('storage helpers', () => {
  beforeEach(() => {
    global.chrome = {
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn()
        }
      }
    };
  });

  test('returns defaults when settings are empty', async () => {
    chrome.storage.local.get.mockResolvedValue({});
    await expect(loadSettings()).resolves.toEqual(defaultSettings);
  });

  test('prepends drafts when saving', async () => {
    chrome.storage.local.get.mockResolvedValue({ drafts: [{ id: 'old' }] });
    chrome.storage.local.set.mockResolvedValue();

    await saveDraft({ id: 'new' });

    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      drafts: [{ id: 'new' }, { id: 'old' }]
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/storage.test.js`
Expected: FAIL because `lib/storage.js` does not exist.

- [ ] **Step 3: Write minimal storage and validation code**

```js
export const defaultSettings = {
  apiKey: '',
  model: 'gemini-2.5-flash'
};

export async function loadSettings() {
  const data = await chrome.storage.local.get(['settings']);
  return { ...defaultSettings, ...(data.settings || {}) };
}

export async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

export async function loadDrafts() {
  const data = await chrome.storage.local.get(['drafts']);
  return data.drafts || [];
}

export async function saveDraft(draft) {
  const drafts = await loadDrafts();
  await chrome.storage.local.set({ drafts: [draft, ...drafts] });
}
```

```js
export function validateChineseInput(value) {
  return Boolean(value && value.trim());
}

export function validateSettings(settings) {
  return Boolean(settings.apiKey && settings.model);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/storage.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/storage.js lib/validators.js tests/storage.test.js
git commit -m "feat: add local settings and draft storage helpers"
```

### Task 3: Add prompt building, response parsing, and Markdown export

**Files:**
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/lib/prompt-builder.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/lib/response-parser.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/lib/markdown.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/tests/content-formatting.test.js`

- [ ] **Step 1: Write the failing formatter test**

```js
import { describe, expect, test } from 'vitest';
import { buildPrompt } from '../lib/prompt-builder.js';
import { parseModelResponse } from '../lib/response-parser.js';
import { toMarkdown, toCopyAllText } from '../lib/markdown.js';

describe('content formatting helpers', () => {
  test('buildPrompt includes level-specific constraints', () => {
    const prompt = buildPrompt({ sourceText: '经济发展', level: 'B' });
    expect(prompt).toContain('按词义分组');
    expect(prompt).toContain('经济jīngjì 发展fāzhǎn');
  });

  test('parseModelResponse accepts valid line2 and line3 fields', () => {
    expect(parseModelResponse('{"line2":"经济jīngjì 发展fāzhǎn","line3":"Economic development."}')).toEqual({
      line2: '经济jīngjì 发展fāzhǎn',
      line3: 'Economic development.'
    });
  });

  test('toCopyAllText excludes line1', () => {
    expect(
      toCopyAllText({
        line2: '经济jīngjì 发展fāzhǎn',
        line3: 'Economic development.'
      })
    ).toBe('经济jīngjì 发展fāzhǎn\\nEconomic development.');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/content-formatting.test.js`
Expected: FAIL because formatter modules do not exist.

- [ ] **Step 3: Write minimal formatter code**

```js
const rulesByLevel = {
  A: '只输出带声调拼音，不显示汉字和英文。',
  B: '按词义分组输出“中文+拼音”，不按单字机械拆分，例如：经济jīngjì 发展fāzhǎn。',
  C: '只输出中文，不显示拼音和英文。'
};

export function buildPrompt({ sourceText, level }) {
  return [
    'You are a Chinese teaching note generator.',
    `Level: ${level}`,
    rulesByLevel[level],
    'Return valid JSON with only line2 and line3.',
    `Source: ${sourceText}`
  ].join('\n');
}
```

```js
export function parseModelResponse(rawText) {
  const parsed = JSON.parse(rawText);
  if (!parsed.line2 || !parsed.line3) {
    throw new Error('Invalid model response');
  }
  return {
    line2: parsed.line2.trim(),
    line3: parsed.line3.trim()
  };
}
```

```js
export function toCopyAllText({ line2, line3 }) {
  return `${line2}\n${line3}`;
}

export function toMarkdown({ line2, line3 }) {
  return `${line2}\n\n${line3}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/content-formatting.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/prompt-builder.js lib/response-parser.js lib/markdown.js tests/content-formatting.test.js
git commit -m "feat: add content generation helpers"
```

### Task 4: Add Gemini client and settings page behavior

**Files:**
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/lib/gemini-client.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/settings.html`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/settings.css`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/settings.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/tests/settings.test.js`

- [ ] **Step 1: Write the failing settings test**

```js
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('settings page', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="settings-form">
        <input id="api-key" />
        <select id="model"><option value="gemini-2.5-flash">gemini-2.5-flash</option></select>
        <button id="save-button" type="submit">Save</button>
      </form>
      <div id="status"></div>
    `;
    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ settings: { apiKey: 'key', model: 'gemini-2.5-flash' } }),
          set: vi.fn().mockResolvedValue()
        }
      }
    };
  });

  test('loads saved settings into the form', async () => {
    const { initSettingsPage } = await import('../settings.js');
    await initSettingsPage();
    expect(document.querySelector('#api-key').value).toBe('key');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/settings.test.js`
Expected: FAIL because `settings.js` does not exist.

- [ ] **Step 3: Write minimal settings and Gemini client code**

```js
import { parseModelResponse } from './response-parser.js';

export async function generateTeachingNote({ apiKey, model, prompt }) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            line2: { type: 'STRING' },
            line3: { type: 'STRING' }
          },
          required: ['line2', 'line3']
        }
      }
    })
  });

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return parseModelResponse(rawText);
}
```

```js
import { loadSettings, saveSettings } from './lib/storage.js';

export async function initSettingsPage() {
  const settings = await loadSettings();
  document.querySelector('#api-key').value = settings.apiKey;
  document.querySelector('#model').value = settings.model;
}

document.querySelector('#settings-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  await saveSettings({
    apiKey: document.querySelector('#api-key').value.trim(),
    model: document.querySelector('#model').value
  });
  document.querySelector('#status').textContent = 'Settings saved.';
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/settings.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/gemini-client.js settings.html settings.css settings.js tests/settings.test.js
git commit -m "feat: add Gemini settings flow"
```

### Task 5: Build the side panel UI and wire all user actions

**Files:**
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/sidepanel.html`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/sidepanel.css`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/sidepanel.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/lib/clipboard.js`
- Create: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/tests/sidepanel.test.js`

- [ ] **Step 1: Write the failing side panel test**

```js
import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('side panel interactions', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="source-text"></textarea>
      <button data-level="A" class="level-button">A</button>
      <button data-level="B" class="level-button">B</button>
      <button id="generate-button">Generate</button>
      <div id="line1"></div>
      <textarea id="line2"></textarea>
      <textarea id="line3"></textarea>
      <button id="copy-line2">Copy Line 2</button>
      <button id="copy-line3">Copy Line 3</button>
      <button id="copy-all">Copy All</button>
    `;
    global.navigator.clipboard = { writeText: vi.fn().mockResolvedValue() };
  });

  test('copy all excludes line1', async () => {
    const { copyAllLines } = await import('../lib/clipboard.js');
    await copyAllLines({ line2: '第二行', line3: 'Third line' });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('第二行\nThird line');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/sidepanel.test.js`
Expected: FAIL because side panel files do not exist.

- [ ] **Step 3: Write minimal side panel code**

```js
export async function copyText(value) {
  await navigator.clipboard.writeText(value);
}

export async function copyAllLines({ line2, line3 }) {
  await copyText(`${line2}\n${line3}`);
}
```

```js
import { buildPrompt } from './lib/prompt-builder.js';
import { generateTeachingNote } from './lib/gemini-client.js';
import { loadSettings, saveDraft } from './lib/storage.js';
import { copyText, copyAllLines } from './lib/clipboard.js';
import { toMarkdown } from './lib/markdown.js';

let selectedLevel = 'A';

function renderLevel() {
  document.querySelector('#line1').value = selectedLevel;
}

async function onGenerate() {
  const sourceText = document.querySelector('#source-text').value.trim();
  const settings = await loadSettings();
  const prompt = buildPrompt({ sourceText, level: selectedLevel });
  const result = await generateTeachingNote({
    apiKey: settings.apiKey,
    model: settings.model,
    prompt
  });
  document.querySelector('#line2').value = result.line2;
  document.querySelector('#line3').value = result.line3;
  renderLevel();
}

document.querySelectorAll('.level-button').forEach((button) => {
  button.addEventListener('click', () => {
    selectedLevel = button.dataset.level;
    renderLevel();
  });
});

document.querySelector('#generate-button')?.addEventListener('click', onGenerate);
document.querySelector('#copy-line2')?.addEventListener('click', () => copyText(document.querySelector('#line2').value));
document.querySelector('#copy-line3')?.addEventListener('click', () => copyText(document.querySelector('#line3').value));
document.querySelector('#copy-all')?.addEventListener('click', () => copyAllLines({
  line2: document.querySelector('#line2').value,
  line3: document.querySelector('#line3').value
}));
document.querySelector('#save-draft')?.addEventListener('click', () => saveDraft({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  sourceText: document.querySelector('#source-text').value.trim(),
  level: selectedLevel,
  line2: document.querySelector('#line2').value,
  line3: document.querySelector('#line3').value
}));
document.querySelector('#export-markdown')?.addEventListener('click', () => {
  document.querySelector('#markdown-output').value = toMarkdown({
    line2: document.querySelector('#line2').value,
    line3: document.querySelector('#line3').value
  });
});
renderLevel();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/sidepanel.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sidepanel.html sidepanel.css sidepanel.js lib/clipboard.js tests/sidepanel.test.js
git commit -m "feat: build side panel note workflow"
```

### Task 6: Verify integrated behavior and polish documentation

**Files:**
- Modify: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/README.md`
- Test: `/Users/adam/Desktop/chinese-teaching-note-sidepanel/tests/*.test.js`

- [ ] **Step 1: Add a failing integration-focused test**

```js
test('markdown export excludes line1 and preserves two-line output', () => {
  expect(toMarkdown({
    line1: 'B',
    line2: '经济jīngjì 发展fāzhǎn',
    line3: 'Economic development.'
  })).toBe('经济jīngjì 发展fāzhǎn\n\nEconomic development.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/content-formatting.test.js`
Expected: FAIL until the helper is updated to ignore `line1`.

- [ ] **Step 3: Update docs and final polish**

```md
## Features

- Side panel workflow for A/B/C Chinese teaching notes
- Local Gemini API key and model settings
- Editable generated note lines
- Copy Line 2, Copy Line 3, Copy All
- Markdown export of Line 2 and Line 3 only
- Local draft list
```

- [ ] **Step 4: Run the full verification suite**

Run: `npm test`
Expected: PASS with all test files green.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/content-formatting.test.js
git commit -m "docs: finalize extension usage and verification"
```
