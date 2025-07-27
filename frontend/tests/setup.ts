// setup.ts
// Global test setup and mocks

import { vi } from 'vitest';

// Mock FloatingText globally
vi.mock('../src/ui/FloatingText', () => ({
  FloatingText: {
    show: vi.fn()
  }
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
}; 