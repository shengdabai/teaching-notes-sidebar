import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // iCloud-safe installs live in node_modules.nosync (node_modules is a symlink to it);
    // keep third-party spec files out of the run.
    exclude: [...configDefaults.exclude, '**/node_modules.nosync/**']
  }
});
