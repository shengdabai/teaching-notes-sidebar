# Chinese Teaching Note Side Panel

Browser extension for generating structured Chinese teaching notes with Gemini in a Chrome side panel.

## Features

- Side panel workflow for A/B/C Chinese teaching notes
- **Dual AI provider support**: DeepSeek (no VPN needed) and Google Gemini
- Compact UI with dropdown level selector — results visible without scrolling
- Editable generated note lines with copy icons
- Copy Line 2, Copy Line 3, Copy All (with error handling)
- Markdown export with timestamped filenames
- Local draft list (max 50) saved in browser storage
- Built-in teaching-style extension icons
- Loading state with disabled button during generation
- Debounced UI state persistence for smooth typing
- 30-second API request timeout
- Dark mode support via `prefers-color-scheme`
- CSS custom property design token system
- Fluid typography and spacing with `clamp()`
- 44px minimum touch targets for all interactive elements
- Full ARIA support: aria-labels, focus-visible
- Empty/safety-filtered response handling

## Level Rules

- `A`: Line 2 contains tone-marked pinyin only
- `B`: Line 2 contains Chinese grouped by meaning with pinyin attached to each phrase group
- `C`: Line 2 contains Chinese only

Line 3 always contains a natural English translation plus a short teaching note.

## Install

1. Open `chrome://extensions/`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the project folder

## First-time Setup

1. Open the extension
2. If no API key is saved yet, the extension opens the settings page automatically
3. Choose a provider: **DeepSeek** (no VPN needed) or **Google Gemini**
4. Add your API key
5. Choose a model (deepseek-chat, gemini-2.5-flash, or gemini-2.5-pro)
6. Click `Save Settings`
7. Use `Cancel` to discard unsaved changes and restore the last saved settings

## Usage

1. Open the side panel from the extension action
2. Enter one Chinese sentence
3. Select `A`, `B`, or `C`
4. Click `Generate Note`
5. Edit Line 2 and Line 3 if needed
6. Copy individual lines, copy both lines, export Markdown, or save to drafts
7. The extension remembers the last input text and selected level locally

## Copy and Export Rules

- `Copy Line 2`: copies only Line 2
- `Copy Line 3`: copies only Line 3
- `Copy All`: copies only Line 2 and Line 3
- `Export Markdown`: exports only Line 2 and Line 3

Empty copy, draft save, and export actions are blocked with a clear status message.

## Drafts

- `Save to Draft`: saves the current Line 2 and Line 3 note locally (max 50 drafts)
- `Reuse`: loads a saved draft back into the editor
- `Export Markdown`: exports one draft as Markdown
- `Delete`: removes a draft from local storage
- Drafts are rendered newest first and show `Level`, saved time, source text, `line2`, and `line3`

## Architecture

```
sidepanel.html / sidepanel.js   Main UI (input, generate, copy, drafts)
settings.html / settings.js     AI provider, API key, and model configuration
background.js                   Service worker (side panel behavior)
lib/
  clipboard.js                  Clipboard write helpers
  llm-client.js                 Dual-provider LLM client (DeepSeek + Gemini)
  markdown.js                   Copy-all and markdown formatting
  prompt-builder.js             Level-aware prompt construction
  response-parser.js            JSON response validation
  storage.js                    Chrome storage (50-draft cap, provider settings)
  validators.js                 Input and settings validation
```

## Design System

- **Tokens**: CSS custom properties for colors, spacing, radii
- **Theming**: Automatic dark mode via `prefers-color-scheme`
- **Responsive**: Fluid sizing with `clamp()`, 44px touch targets
- **Accessibility**: WCAG AA compliant focus indicators, ARIA roles and labels

## Chrome Debugging

Use [chrome-debug-checklist.md](docs/chrome-debug-checklist.md) for real browser loading and Gemini API troubleshooting.

## Development

```bash
npm install
npm test
```
