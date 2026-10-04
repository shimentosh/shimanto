import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  // Node-environment tests (e.g. the token file check) have no DOM.
  if (typeof document === 'undefined') return;
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
