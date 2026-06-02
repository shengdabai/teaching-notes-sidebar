# Chinese Teaching Note Builder

AI-powered Chinese teaching note generator — a Chrome extension that converts Chinese vocabulary into formatted teaching notes with pinyin and English explanations.

## Features

- **9 AI Providers**: DeepSeek (default, no VPN needed), MiniMax, GLM, ChatGPT, Claude, Kimi, Qwen, Gemini, Custom OpenAI-compatible
- **Dual UI**: Chrome sidepanel + floating in-page panel (draggable, resizable)
- **3 Difficulty Levels** (line 2 changes per level; pinyin is grouped by word, not by single syllable):
  - **A** — pinyin only (e.g. `Běijīng`)
  - **B** — Chinese + pinyin per word (e.g. `经济jīngjì 发展fāzhǎn`)
  - **C** — Chinese only (e.g. `城市`)
- **Export**: Copy to clipboard or export as Markdown
- **Auto-save**: Notes persisted in chrome.storage.local
- **Dark Mode**: Full dark/light theme support

## Quick Start

1. Clone this repository
2. Open Chrome → `chrome://extensions/` → Developer mode
3. Click **Load unpacked** → select this directory
4. Click the extension icon to open the sidepanel

## Tests

```bash
npm install
npm test
```

Test coverage:
- Smoke tests (module loading, basic functionality)
- Sidepanel UI tests (rendering, interactions)
- Settings tests (provider config, API key validation)
- Storage tests (CRUD operations, chrome.storage mock)
- Content formatting tests (pinyin, level display)
- LLM client tests (multi-provider request/response parsing)
- Validator tests (level, input, API key, provider validation)

## CI/CD

GitHub Actions runs on every push:
- Vitest test suite
- Manifest version sync validation (package.json ↔ manifest.json)

## Version

Current: **2.2.0** (synced between package.json and manifest.json)

## Roadmap

- [ ] Chrome Web Store publication
- [ ] Vocabulary book feature (import/export CSV)
- [ ] Batch generation (multiple words at once)
- [ ] History and search
- [ ] TypeScript migration

## License

MIT
