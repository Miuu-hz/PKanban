import { type ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { useLiffContext } from '../../modules/liff/LiffProvider';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { state, error } = useLiffContext();
  const { user, isReady, init } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (state === 'ready') init();
  }, [state, init]);

  useEffect(() => {
    if (isReady && !user) navigate('/splash', { replace: true });
  }, [isReady, user, navigate]);

  if (state === 'error') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-red-500 font-medium">ไม่สามารถเชื่อมต่อ LINE ได้</p>
        <p className="text-sm text-gray-500">{error}</p>
        <button
          className="rounded-lg bg-line px-6 py-2 text-white font-medium"
          onClick={() => window.location.reload()}
        >
          ลองใหม่
        </button>
      </div>
    );
  }

  if (state === 'loading' || !isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
