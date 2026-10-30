# Chrome Side Panel Debug Checklist

These are manual checks for the current side-panel UI. The extension does not inject a floating panel into web pages. The March 2026 design and implementation plan describe an earlier UI; their draft controls and file paths are historical.

## 1. Load the extension

1. Open `chrome://extensions/` and enable **Developer mode**.
2. Click **Load unpacked** and select this repository directory, which contains [manifest.json](../manifest.json).
3. Confirm that the extension loads without manifest or icon errors.
4. Pin the toolbar icon and click it. The extension's own side panel should open.
5. After changing files, click **Reload** on the extension card and reopen the panel.

If the panel does not open, inspect the extension's service worker and check [background.js](../background.js). The current implementation uses `chrome.sidePanel.setPanelBehavior`; it does not inject scripts into tabs.

## 2. Inspect the panel and settings

- Right-click inside the panel and choose **Inspect** for UI and request errors.
- Use the extension card's **service worker** link for background errors.
- With no configured key/model, the panel should open the settings page automatically.
- The footer **Open settings page** button should also open settings.
- Use only synthetic input and a disposable browser profile for tests. Do not include keys, private notes, or request headers in screenshots or bug reports.

Relevant files: [sidepanel.js](../sidepanel.js), [settings.js](../settings.js), [lib/storage.js](../lib/storage.js).

## 3. Generate, copy and export

A real generation or **Test Connection** action calls the selected paid provider. Run these only with explicit authorization for that API use; otherwise use mocked requests.

1. Configure the chosen provider, API key and model, then save settings.
2. Enter synthetic text such as `经济发展`, select level **B**, and click **Generate**.
3. During generation, confirm that Generate, Level and Reset are disabled and Input is read-only. Input should retain keyboard focus. Repeated Enter must not start another request.
4. After completion, confirm that the controls are enabled, Input is editable again, and its text is unchanged.
5. Confirm that Note contains Chinese plus pinyin, and Explanation contains English.
6. Check **Copy Note** and **Copy Explanation** independently.
7. Check **Copy All**: it includes the current Input, Note and Explanation with labels.
8. Check **Export MD**: it downloads saved notes with source text, level, note, explanation and creation metadata. It exports stored notes, not unsaved field edits.
9. Click **Reset**: the visible fields should clear and Level should return to A. Saved notes remain available for export.
10. Close and reopen the panel: Input and Level should restore from local storage. Generated result fields are not persisted as UI state.

Repeat generation with level **A** (pinyin only) and **C** (Chinese only). Confirm that Enter generates, Shift+Enter inserts a newline, and Enter during Chinese IME composition does not generate.

## 4. Error paths

- Empty or non-Chinese input: show `Please enter Chinese text first.` without a request.
- Missing key/model: show `Please configure AI settings first.` without a request.
- Failed settings read, request or note save: show an error and release all generation controls.
- Failed export read: show an error rather than leaving the click unhandled.
- No saved notes: show `No notes to export.`.
- Clipboard rejection: show `Failed to copy.`.

For a provider error, inspect status codes and sanitized messages. Do not copy authorization headers into reports. For Gemini, the request parser joins non-thought text parts from the first candidate before parsing the note JSON; see [lib/llm-client.js](../lib/llm-client.js).

## 5. Settings regression checks

- Selecting Gemini should offer `gemini-2.5-flash` (default) and `gemini-2.5-pro`. Saving and reopening should preserve the selected model. Its endpoint field remains hidden.
- Opening settings or using Cancel should preserve a saved custom endpoint. Only changing the provider clears the endpoint and API key in the form; saved storage remains unchanged until Save.
- Use a mocked pending connection test: repeated clicks should make only one request. All settings fields, Save, Cancel and Test Connection remain disabled until it completes or fails, then become usable again.
- During a pending save or Cancel read, controls should also be locked. A failed save or read should show an error, release controls, and preserve the unsaved form values.
- Custom requires an endpoint. Public endpoints must use HTTPS; HTTP is accepted only for `localhost` or loopback IPs. Embedded URL usernames/passwords are rejected. Invalid settings must neither save nor trigger a request.
- Requests reject redirects so credentials cannot follow a redirect to another destination. Configure the final API URL directly.

The Gemini model IDs match the existing client allowlist and Google's official [Flash](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash) and [Pro](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro) references (checked 2026-10-30). Google currently limits 2.5 access to prior users; new accounts may need a newer model that this legacy extension does not yet list. Passing the mocked tests does not establish account access, provider availability, or real-browser behavior.

## 6. Local automated checks

```sh
npm ci
npm test
```

There is no build, lint or typecheck script. Tests use Vitest and jsdom; they do not exercise Chrome extension APIs in a real browser or establish provider availability. CI also checks that `package.json` and `manifest.json` versions match.
