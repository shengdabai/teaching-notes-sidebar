# Chrome Load And Gemini Debug Checklist

## 1. Load The Extension

1. Open `chrome://extensions/`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select `/Users/adam/Desktop/中文教学/教学笔记-侧边栏插件`
5. Confirm the extension card appears without manifest errors

If Chrome shows a manifest error:

- Re-open [manifest.json](/Users/adam/Desktop/chinese-teaching-note-sidepanel/manifest.json)
- Check that `side_panel.default_path` is `sidepanel.html`
- Check that the icon files exist in `/Users/adam/Desktop/中文教学/教学笔记-侧边栏插件/icons`

## 2. Open The Side Panel

1. Pin the extension in the toolbar if needed
2. Click the extension icon
3. Confirm the side panel opens on the right

If clicking the icon does nothing:

- Open the extension card in `chrome://extensions/`
- Click `service worker`
- Check for errors from [background.js](/Users/adam/Desktop/中文教学/教学笔记-侧边栏插件/background.js)

## 3. First-Time Settings Flow

Expected behavior:

- If no API key is saved, the extension should open the settings page automatically
- After saving a valid key and model, the side panel should stop redirecting you to settings

If settings do not open automatically:

- Open the side panel DevTools
- Check whether [sidepanel.js](/Users/adam/Desktop/中文教学/教学笔记-侧边栏插件/sidepanel.js) reports `Please configure Gemini settings first.`
- Manually click `Settings`

## 4. How To Open DevTools For The Extension

For the side panel:

- Right-click inside the side panel
- Choose `Inspect`

For the service worker:

- Go to `chrome://extensions/`
- Find the extension
- Click the `service worker` link

Use the side panel DevTools for UI errors and `fetch` errors.
Use the service worker DevTools for extension lifecycle errors.

## 5. Gemini Request Checks

When `Generate Note` is clicked, verify:

- `API key` is saved
- `model` is valid
- Network request goes to:
  - `https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent`
- Request header includes:
  - `x-goog-api-key`
- Response contains:
  - `candidates[0].content.parts[0].text`

## 6. Common Failures

### Invalid API key

Symptoms:

- `401` or `403`
- Error message from Gemini about authentication

Check:

- Re-enter the API key in settings
- Use `Test Connection`

### Wrong model name

Symptoms:

- `404` or model not found

Check:

- Switch back to `gemini-2.5-flash`
- Save settings and test again

### Invalid model response

Symptoms:

- UI shows `Invalid model response`

Check:

- Open side panel DevTools
- Inspect the raw Gemini response
- Confirm the model returned JSON with exactly `line2` and `line3`

### Nothing happens after clicking Generate

Check:

- Console errors in side panel DevTools
- Whether the input is empty
- Whether settings were saved
- Whether the request is blocked by network failure

### Draft actions look wrong

Check:

- Saved drafts are ordered newest first
- Each draft shows `Level`, saved time, original source text, `line2`, and `line3`

## 7. Quick Real-Use Test Script

After loading the extension, try this sequence:

1. Save `Gemini API Key`
2. Keep model at `gemini-2.5-flash`
3. Input `你叫什么名字`
4. Select `B`
5. Click `Generate Note`
6. Confirm:
   - `Line 1` shows `B`
   - `Line 2` shows grouped Chinese + pinyin
   - `Line 3` shows natural English + one useful teaching point
7. Test:
   - `Copy Line 2`
   - `Copy Line 3`
   - `Copy All`
   - `Save to Draft`
   - `Export Markdown`

## 8. Files To Inspect First

- [manifest.json](/Users/adam/Desktop/中文教学/教学笔记-侧边栏插件/manifest.json)
- [background.js](/Users/adam/Desktop/中文教学/教学笔记-侧边栏插件/background.js)
- [sidepanel.js](/Users/adam/Desktop/中文教学/教学笔记-侧边栏插件/sidepanel.js)
- [settings.js](/Users/adam/Desktop/中文教学/教学笔记-侧边栏插件/settings.js)
- [lib/gemini-client.js](/Users/adam/Desktop/中文教学/教学笔记-侧边栏插件/lib/gemini-client.js)
