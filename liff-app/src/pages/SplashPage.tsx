import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiffContext } from '../modules/liff/LiffProvider';
import { authService } from '../services/authService';

export default function SplashPage() {
  const { state } = useLiffContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (state === 'ready' && authService.isAuthenticated()) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-line-light px-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-line shadow-lg">
        <span className="text-4xl">📋</span>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">Kanban SME</h1>
        <p className="mt-1 text-sm text-gray-500">จัดการงานในทีมได้ง่ายๆ ผ่าน LINE</p>
      </div>
      {state === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-transparent" />
          <span>กำลังเชื่อมต่อ LINE...</span>
        </div>
      )}
      {state === 'error' && (
        <p className="text-sm text-red-500">เปิดแอปนี้ผ่าน LINE เพื่อเข้าใช้งาน</p>
      )}
    </div>
  );
}
