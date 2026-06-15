import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckInPage from '../../pages/hr/CheckInPage';

// vi.hoisted ensures variables are initialized before the hoisted vi.mock factory runs
const { mockGet, mockPost } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
}));
vi.mock('../../services/apiClient', () => ({
  apiClient: {
    get: mockGet,
    post: mockPost,
  },
}));

// Mock geolocation
const mockGetCurrentPosition = vi.fn();
Object.defineProperty(global.navigator, 'geolocation', {
  value: { getCurrentPosition: mockGetCurrentPosition },
  writable: true,
});

function renderPage() {
  return render(
    <MemoryRouter>
      <CheckInPage />
    </MemoryRouter>,
  );
}

describe('CheckInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner initially', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows not_checked_in status when no records today', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'not_checked_in', records: [] } });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/ยังไม่เช็คอิน/)).toBeTruthy();
    });
  });

  it('shows checked_in status when last record is in', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        status: 'checked_in',
        records: [{ type: 'in', checked_at: new Date().toISOString(), lat: null, lng: null }],
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/กำลังทำงาน/)).toBeTruthy();
    });
  });

  it('shows เช็คเอาท์ button when checked in', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'checked_in', records: [] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('เช็คเอาท์')).toBeTruthy();
    });
  });

  it('shows เช็คอิน button when not checked in', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'not_checked_in', records: [] } });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('เช็คอิน')).toBeTruthy();
    });
  });

  it('calls /hr/checkin with GPS coords on check-in', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'not_checked_in', records: [] } });
    mockGetCurrentPosition.mockImplementationOnce((success) => {
      success({ coords: { latitude: 13.7563, longitude: 100.5018 } });
    });
    mockPost.mockResolvedValueOnce({ data: { id: 'ci-1', type: 'in' } });
    mockGet.mockResolvedValueOnce({ data: { status: 'checked_in', records: [] } });

    renderPage();

    await waitFor(() => expect(screen.getByText('เช็คอิน')).toBeTruthy());
    fireEvent.click(screen.getByText('เช็คอิน'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/hr/checkin', {
        lat: 13.7563,
        lng: 100.5018,
      });
    });
  });

  it('shows error message when GPS is too far from office', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'not_checked_in', records: [] } });
    mockGetCurrentPosition.mockImplementationOnce((success) => {
      success({ coords: { latitude: 14.0, longitude: 101.0 } });
    });
    mockPost.mockRejectedValueOnce({
      response: { data: { error: 'อยู่ห่างจากสำนักงาน 30000 เมตร (อนุญาต 300 เมตร)', distance_m: 30000 } },
    });

    renderPage();

    await waitFor(() => expect(screen.getByText('เช็คอิน')).toBeTruthy());
    fireEvent.click(screen.getByText('เช็คอิน'));

    await waitFor(() => {
      expect(screen.getByText(/อยู่ห่างจากสำนักงาน/)).toBeTruthy();
    });
  });

  it('shows today\'s records in a list', async () => {
    const now = new Date().toISOString();
    mockGet.mockResolvedValueOnce({
      data: {
        status: 'checked_out',
        records: [
          { type: 'in', checked_at: now, lat: null, lng: null },
          { type: 'out', checked_at: now, lat: null, lng: null },
        ],
      },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('▶ เข้างาน')).toBeTruthy();
      expect(screen.getByText('■ ออกงาน')).toBeTruthy();
    });
  });

  it('disables button when status is checked_out', async () => {
    mockGet.mockResolvedValueOnce({ data: { status: 'checked_out', records: [] } });
    renderPage();

    await waitFor(() => {
      // When checked_out, btnLabel = 'เช็คอิน' (isCheckedIn is false) but button is disabled
      const btn = screen.getByText('เช็คอิน').closest('button');
      expect(btn).toBeDisabled();
    });
  });
});
