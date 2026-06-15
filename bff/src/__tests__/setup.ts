// Global test setup — runs before each test file
import { vi } from 'vitest';

// Reset all mocks between tests
afterEach(() => {
  vi.clearAllMocks();
});
