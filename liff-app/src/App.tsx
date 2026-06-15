import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LiffProvider } from './modules/liff/LiffProvider';
import { AuthGuard } from './components/layout/AuthGuard';
import SplashPage from './pages/SplashPage';
import BoardsListPage from './pages/BoardsListPage';
import BoardDetailPage from './pages/BoardDetailPage';
import CheckInPage from './pages/hr/CheckInPage';
import CalendarSyncPage from './pages/settings/CalendarSyncPage';

export default function App() {
  return (
    <LiffProvider liffId={import.meta.env.VITE_LIFF_ID}>
      <BrowserRouter>
        <Routes>
          <Route path="/splash" element={<SplashPage />} />
          <Route
            path="/"
            element={
              <AuthGuard>
                <BoardsListPage />
              </AuthGuard>
            }
          />
          <Route
            path="/boards/:boardId"
            element={
              <AuthGuard>
                <BoardDetailPage />
              </AuthGuard>
            }
          />
          <Route
            path="/hr/checkin"
            element={
              <AuthGuard>
                <CheckInPage />
              </AuthGuard>
            }
          />
          <Route
            path="/settings/calendar"
            element={
              <AuthGuard>
                <CalendarSyncPage />
              </AuthGuard>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LiffProvider>
  );
}
