// Global test setup — runs before each test file
import { vi, afterEach } from 'vitest';

// Reset all mocks between tests
afterEach(() => {
  vi.clearAllMocks();
});
