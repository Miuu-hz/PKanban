import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Clock } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../stores/useAuthStore';
import { useKanbanStore, type Board } from '../stores/useKanbanStore';

export default function BoardsListPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { boards, setBoards } = useKanbanStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = user?.orgIds[0];

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    apiClient.get(`/org/${orgId}`)
      .then((res) => {
        const projectId = res.data.planka_project_id as string;
        return apiClient.get(`/kanban/projects/${projectId}/boards`);
      })
      .then((res) => {
        setBoards((res.data.items ?? []) as Board[]);
      })
      .catch(() => setError('โหลดบอร์ดไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, [orgId, setBoards]);

  if (!orgId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-gray-600">ยังไม่ได้เข้าร่วมองค์กร</p>
        <button
          className="rounded-xl bg-line px-6 py-3 text-white font-semibold shadow"
          onClick={() => navigate('/org/create')}
        >
          สร้างองค์กรใหม่
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <div className="safe-top sticky top-0 z-10 flex items-center justify-between bg-line px-4 py-3 text-white shadow">
        <span className="text-lg font-semibold">บอร์ดของฉัน</span>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/hr/checkin')} className="rounded-lg p-1.5 hover:bg-white/20">
            <Clock size={20} />
          </button>
          <button onClick={logout} className="rounded-lg p-1.5 hover:bg-white/20">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-transparent" />
          </div>
        )}
        {error && <p className="py-8 text-center text-sm text-red-500">{error}</p>}

        {!loading && !error && (
          <div className="grid grid-cols-2 gap-3">
            {boards.map((board) => (
              <button
                key={board.id}
                className="flex min-h-[100px] flex-col justify-between rounded-2xl bg-white p-4 shadow-sm active:scale-95 transition-transform"
                onClick={() => navigate(`/boards/${board.id}`)}
              >
                <div className="h-8 w-8 rounded-lg bg-line-light flex items-center justify-center">
                  <span className="text-xl">📋</span>
                </div>
                <span className="mt-3 text-left text-sm font-semibold text-gray-800 leading-snug">
                  {board.name}
                </span>
              </button>
            ))}

            {/* Add board */}
            <button
              className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 active:scale-95 transition-transform"
              onClick={() => {/* TODO: create board modal */}}
            >
              <Plus size={24} />
              <span className="text-xs">เพิ่มบอร์ด</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <nav className="safe-bottom sticky bottom-0 flex border-t bg-white">
        {[
          { label: 'บอร์ด', icon: '📋', path: '/' },
          { label: 'เช็คอิน', icon: '📍', path: '/hr/checkin' },
          { label: 'ตั้งค่า', icon: '⚙️', path: '/settings/calendar' },
        ].map((item) => (
          <button
            key={item.path}
            className="flex flex-1 flex-col items-center gap-0.5 py-2 text-gray-500"
            onClick={() => navigate(item.path)}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
