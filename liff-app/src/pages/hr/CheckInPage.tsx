import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, AlertCircle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

type Status = 'not_checked_in' | 'checked_in' | 'checked_out';

interface TodayRecord {
  type: 'in' | 'out';
  checked_at: string;
  lat: number | null;
  lng: number | null;
}

export default function CheckInPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('not_checked_in');
  const [records, setRecords] = useState<TodayRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/hr/today')
      .then((res) => {
        setStatus(res.data.status as Status);
        setRecords(res.data.records as TodayRecord[]);
      })
      .catch(() => setError('โหลดข้อมูลไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  async function handleAction() {
    setError(null);
    setSubmitting(true);
    try {
      const pos = await getPosition();
      const endpoint = status === 'checked_in' ? '/hr/checkout' : '/hr/checkin';
      const res = await apiClient.post(endpoint, {
        lat: pos?.lat,
        lng: pos?.lng,
      });
      const updated = await apiClient.get('/hr/today');
      setStatus(updated.data.status as Status);
      setRecords(updated.data.records as TodayRecord[]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    } finally {
      setSubmitting(false);
    }
  }

  const isCheckedIn = status === 'checked_in';
  const btnLabel = isCheckedIn ? 'เช็คเอาท์' : 'เช็คอิน';
  const btnColor = isCheckedIn ? 'bg-red-500' : 'bg-line';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="safe-top flex items-center gap-2 bg-line px-3 py-3 text-white shadow">
        <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 hover:bg-white/20">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-base font-semibold">เช็คอิน / เช็คเอาท์</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 p-6">
        {loading ? (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-line border-t-transparent" />
        ) : (
          <>
            {/* Status badge */}
            <div className={`rounded-2xl px-6 py-3 text-sm font-semibold ${
              isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {isCheckedIn ? '🟢 กำลังทำงาน' : status === 'checked_out' ? '🔴 ออกงานแล้ว' : '⚪ ยังไม่เช็คอิน'}
            </div>

            {/* Big action button */}
            <button
              className={`flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-full ${btnColor} text-white shadow-xl active:scale-95 transition-all disabled:opacity-60`}
              onClick={handleAction}
              disabled={submitting || status === 'checked_out'}
            >
              <MapPin size={36} />
              <span className="text-lg font-bold">{btnLabel}</span>
              {submitting && <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            </button>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Today records */}
            {records.length > 0 && (
              <div className="w-full rounded-2xl bg-white p-4 shadow-sm">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">บันทึกวันนี้</p>
                {records.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className={`text-sm font-medium ${r.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                      {r.type === 'in' ? '▶ เข้างาน' : '■ ออกงาน'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(r.checked_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

async function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}
