# Chrome Load And Debug Checklist

## 1. Load The Extension

1. Open `chrome://extensions/` and enable `Developer mode`.
2. Click `Load unpacked` and select the repository directory containing [manifest.json](../manifest.json).
3. Confirm the extension card has no manifest errors.
4. Open a normal `https://` or `http://` page and click the extension icon.
5. Confirm the floating Note Builder panel opens. Click again to hide it.

The current manifest uses [injected-panel.js](../injected-panel.js), injected by
[background.js](../background.js). It does not register Chrome's native side panel.
The standalone [sidepanel.html](../sidepanel.html) and its tests remain in the repository.
Chrome internal pages such as `chrome://extensions/` cannot host the floating panel.

If loading fails, inspect the manifest and confirm its background script, options
page, and `icons/` files exist. If the toolbar click fails, inspect the service
worker from the extension card. Note whether the problem occurs after switching tabs.

## 2. Configure Settings

Open the extension's options page from `chrome://extensions/`, or click the
floating panel's Settings button. Select a provider, enter your own API key and
model, then save. Never include the key in screenshots, logs, or bug reports.
The default provider is DeepSeek; request handling is in [lib/llm-client.js](../lib/llm-client.js).

Settings use `chrome.storage.session` when available, so a browser restart can
require configuration again. Notes and input/level state use `chrome.storage.local`.
Do not clear extension storage while investigating saved-note issues.

`Test Connection` sends a real request to the chosen provider. Run it only when
that request and any provider cost are authorized. Offline tests use synthetic
settings and mocked responses instead.

## 3. Inspect Errors

For the floating panel, open the host page's DevTools and inspect console errors.
For background requests, use the extension card's service-worker DevTools.
The standalone page's errors belong to [sidepanel.js](../sidepanel.js).

When reporting an error, include the action, selected provider/model/level,
error text, and whether the request was sent. Remove keys and personal data.
Do not paste raw request headers or private teaching material.

## 4. Generation Checks

With an authorized provider request, use a synthetic phrase such as `北京`:

1. Choose level B and generate.
2. Confirm the result contains Chinese with pinyin and an English explanation.
3. During generation, confirm Input, Level, Generate, and Reset are disabled.
4. Confirm rapid repeated Enter presses do not start another request.
5. Confirm the controls become available after success or failure.
6. Confirm Shift+Enter inserts a new line without generating.
7. Confirm using Enter to confirm Chinese IME composition does not generate.
8. Close and reopen the floating panel during generation; confirm the input and
   level still match the pending request.

Generation auto-saves successful results. A visible result alone does not prove
storage succeeded: the floating panel currently sends its save message without
waiting for a storage acknowledgement.

## 5. Copy, Export, And State

- Copy Note and Copy Explanation copy the corresponding result only.
- Copy All includes labeled Input, Note, and Explanation sections.
- Export MD downloads saved notes, including their level, source, and timestamps.
- Change only the level, then hide/reopen the panel; confirm it is restored.
- Reset clears Input and both result fields and selects level A.
- If clipboard access fails, record the page context; do not grant additional
  extension permissions as a debugging shortcut.

The March design and implementation plan in `docs/superpowers/` are historical.
Their draft-list UI, Gemini-only settings, and side-panel registration do not
fully describe the current implementation.

## 6. Offline Verification

```bash
npm ci --no-audit --no-fund
npm test
```

The lockfile is the dependency source. There are no separate build, lint, or
typecheck scripts. Tests exercise mocked provider requests; they do not prove
live provider connectivity, Chrome permission behavior, or Chrome Web Store readiness.
