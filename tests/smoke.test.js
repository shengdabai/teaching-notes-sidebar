import { describe, expect, test } from 'vitest';
import manifest from '../manifest.json' assert { type: 'json' };

describe('extension manifest', () => {
  test('declares MV3 injected panel extension basics', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('activeTab');
    expect(manifest.permissions).toContain('scripting');
    expect(manifest.action.default_title).toBe('Toggle Teaching Note Builder');
    expect(manifest.icons['16']).toBe('icons/icon16.png');
    expect(manifest.icons['48']).toBe('icons/icon48.png');
    expect(manifest.icons['128']).toBe('icons/icon128.png');
  });
});
