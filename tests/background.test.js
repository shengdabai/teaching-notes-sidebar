import { beforeEach, describe, expect, test, vi } from 'vitest';

describe('floating panel visibility by tab', () => {
  let session, clickAction, receiveMessage, removeTab;
  const tabA = { id: 1, url: 'https://example.com/a' };
  const tabB = { id: 2, url: 'https://example.com/b' };

  async function loadBackground() {
    vi.resetModules();
    await import('../background.js');
    clickAction = chrome.action.onClicked.addListener.mock.lastCall[0];
    receiveMessage = chrome.runtime.onMessage.addListener.mock.lastCall[0];
    removeTab = chrome.tabs.onRemoved.addListener.mock.lastCall?.[0];
  }

  beforeEach(async () => {
    session = {};
    global.chrome = {
      runtime: {
        openOptionsPage: vi.fn().mockResolvedValue(),
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() }
      },
      storage: { local: {
        get: vi.fn().mockResolvedValue({ notes: [] }),
        set: vi.fn().mockResolvedValue()
      }, session: {
        get: vi.fn(async (key) => ({ [key]: session[key] })),
        set: vi.fn(async (values) => { Object.assign(session, values); }),
        remove: vi.fn(async (key) => { delete session[key]; })
      } },
      action: { onClicked: { addListener: vi.fn() } },
      tabs: {
        sendMessage: vi.fn().mockResolvedValue(),
        onRemoved: { addListener: vi.fn() }
      },
      scripting: { executeScript: vi.fn().mockResolvedValue() }
    };
    await loadBackground();
  });

  test('the first click in each tab shows its panel and later clicks toggle independently', async () => {
    await clickAction(tabA);
    await clickAction(tabB);
    await clickAction(tabA);
    await clickAction(tabB);

    expect(chrome.tabs.sendMessage.mock.calls).toEqual([
      [tabA.id, { action: 'show-panel' }],
      [tabB.id, { action: 'show-panel' }],
      [tabA.id, { action: 'hide-panel' }],
      [tabB.id, { action: 'hide-panel' }]
    ]);
    expect(chrome.scripting.executeScript).toHaveBeenCalledTimes(2);
  });

  test('closing one panel updates only the sender tab', async () => {
    await clickAction(tabA);
    await clickAction(tabB);
    await receiveMessage({ action: 'panel-hidden' }, { tab: tabB }, vi.fn());
    chrome.tabs.sendMessage.mockClear();
    await clickAction(tabA);
    await clickAction(tabB);

    expect(chrome.tabs.sendMessage.mock.calls).toEqual([
      [tabA.id, { action: 'hide-panel' }],
      [tabB.id, { action: 'show-panel' }]
    ]);
  });

  test('ignores a panel-hidden message without a sender tab', async () => {
    await clickAction(tabA);
    chrome.storage.session.set.mockClear();
    await receiveMessage({ action: 'panel-hidden' }, {}, vi.fn());
    expect(chrome.storage.session.set).not.toHaveBeenCalled();

    await clickAction(tabA);
    expect(chrome.tabs.sendMessage).toHaveBeenLastCalledWith(tabA.id, { action: 'hide-panel' });
  });

  test('removes a closed tab from session storage and preserves other tab state', async () => {
    await clickAction(tabA);
    await clickAction(tabB);
    const beforeClose = Object.keys(session).length;
    expect(removeTab).toBeTypeOf('function');
    await removeTab(tabA.id);
    expect(Object.keys(session)).toHaveLength(beforeClose - 1);
    expect(chrome.storage.session.remove).toHaveBeenCalledTimes(1);

    await clickAction(tabB);
    expect(chrome.tabs.sendMessage).toHaveBeenLastCalledWith(tabB.id, { action: 'hide-panel' });
    await clickAction(tabA);
    expect(chrome.tabs.sendMessage).toHaveBeenLastCalledWith(tabA.id, { action: 'show-panel' });
  });

  test('keeps per-tab visibility across service worker reloads', async () => {
    await clickAction(tabA);
    await loadBackground();
    await clickAction(tabB);
    expect(chrome.tabs.sendMessage).toHaveBeenLastCalledWith(tabB.id, { action: 'show-panel' });
    await clickAction(tabA);
    expect(chrome.tabs.sendMessage).toHaveBeenLastCalledWith(tabA.id, { action: 'hide-panel' });
  });

  test('simultaneous clicks in different tabs do not overwrite each other', async () => {
    await Promise.all([clickAction(tabA), clickAction(tabB)]);
    chrome.tabs.sendMessage.mockClear();
    await clickAction(tabA);
    await clickAction(tabB);
    expect(chrome.tabs.sendMessage.mock.calls).toEqual([
      [tabA.id, { action: 'hide-panel' }],
      [tabB.id, { action: 'hide-panel' }]
    ]);
  });

  test('ignores pages where the panel cannot be injected', async () => {
    await clickAction({ id: 3, url: 'chrome://extensions/' });
    await clickAction({ id: 4 });
    expect(chrome.storage.session.get).not.toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  test('creates note IDs in the extension and acknowledges only after saving', async () => {
    let finishSave;
    chrome.storage.local.set.mockImplementation(() => new Promise((resolve) => { finishSave = resolve; }));
    const reply = vi.fn();
    const note = { sourceText: '北京', level: 'B', line2: '北京Běijīng', line3: 'Beijing.' };
    expect(receiveMessage({ action: 'save-note', note }, { tab: tabA }, reply)).toBe(true);
    await vi.waitFor(() => expect(chrome.storage.local.set).toHaveBeenCalledTimes(1));
    expect(reply).not.toHaveBeenCalled();
    const saved = chrome.storage.local.set.mock.calls[0][0].notes[0];
    expect(saved).toMatchObject(note);
    expect(saved.id).toMatch(/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i);
    finishSave();
    await vi.waitFor(() => expect(reply).toHaveBeenCalledWith({ ok: true }));
  });

  test('returns a storage failure to the panel instead of acknowledging success', async () => {
    chrome.storage.local.set.mockRejectedValueOnce(new Error('Storage quota exceeded.'));
    const reply = vi.fn();
    expect(receiveMessage({ action: 'save-note', note: { sourceText: '北京' } }, { tab: tabA }, reply)).toBe(true);
    await vi.waitFor(() => expect(reply).toHaveBeenCalledWith({ error: 'Storage quota exceeded.' }));
    expect(reply).toHaveBeenCalledTimes(1);
  });

  test('preserves an existing note ID when saving', async () => {
    const reply = vi.fn();
    receiveMessage({ action: 'save-note', note: { id: 'existing-id', sourceText: '北京' } }, {}, reply);
    await vi.waitFor(() => expect(reply).toHaveBeenCalledWith({ ok: true }));
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ notes: [expect.objectContaining({ id: 'existing-id' })] });
  });

  test.each(['get-settings', 'get-ui-state', 'get-notes'])('returns a %s read error through the message channel', async (action) => {
    chrome.storage.session.get.mockRejectedValueOnce(new Error('Storage unavailable.'));
    chrome.storage.local.get.mockRejectedValueOnce(new Error('Storage unavailable.'));
    const reply = vi.fn();
    expect(receiveMessage({ action }, { tab: tabA }, reply)).toBe(true);
    await vi.waitFor(() => expect(reply).toHaveBeenCalledWith({ error: 'Storage unavailable.' }));
  });

  test('opens settings from the extension context and acknowledges success', async () => {
    const reply = vi.fn();
    expect(receiveMessage({ action: 'open-settings' }, { tab: tabA }, reply)).toBe(true);
    await vi.waitFor(() => expect(reply).toHaveBeenCalledWith({ ok: true }));
    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  test('returns an options-page opening failure to the panel', async () => {
    chrome.runtime.openOptionsPage.mockRejectedValueOnce(new Error('Options page unavailable.'));
    const reply = vi.fn();
    receiveMessage({ action: 'open-settings' }, { tab: tabA }, reply);
    await vi.waitFor(() => expect(reply).toHaveBeenCalledWith({ error: 'Options page unavailable.' }));
  });
});
