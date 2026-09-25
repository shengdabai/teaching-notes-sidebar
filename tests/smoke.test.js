import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';
import manifest from '../manifest.json' assert { type: 'json' };

const root = resolve(__dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

describe('extension manifest', () => {
  test('declares MV3 side panel extension basics', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.side_panel.default_path).toBe('sidepanel.html');
    expect(manifest.action.default_title).toBe('Open Teaching Note Builder');
    expect(manifest.icons['16']).toBe('icons/icon16.png');
    expect(manifest.icons['48']).toBe('icons/icon48.png');
    expect(manifest.icons['128']).toBe('icons/icon128.png');
  });
});

describe('no UI in host pages', () => {
  test('manifest grants no way to run code in web pages', () => {
    expect(manifest.permissions).not.toContain('scripting');
    expect(manifest.permissions).not.toContain('activeTab');
    expect(manifest.content_scripts).toBeUndefined();
  });

  test('background opens the side panel and never injects into tabs', () => {
    const bg = read('background.js');
    expect(bg).toContain('openPanelOnActionClick: true');
    expect(bg).not.toMatch(/executeScript|insertCSS|tabs\.sendMessage|onMessage/);
    expect(existsSync(resolve(root, 'injected-panel.js'))).toBe(false);
  });
});
