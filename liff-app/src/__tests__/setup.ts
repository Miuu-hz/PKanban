import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Clear localStorage between tests
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// Mock import.meta.env for Vite
vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:3000');
vi.stubEnv('VITE_LIFF_ID', 'test-liff-id');
vi.stubEnv('VITE_DEV_MOCK_MODE', 'true');
