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
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() }
      },
      storage: { session: {
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
});
