import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Copy, Check, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { apiClient } from '../../services/apiClient';

const BASE = import.meta.env.VITE_API_BASE_URL as string;
const APP_DOMAIN = BASE.replace('/bff', '');

export default function CalendarSyncPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [icalToken, setIcalToken] = useState(user?.icalToken ?? '');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const feedUrl = `${APP_DOMAIN}/bff/calendar/${user?.id}/feed.ics?token=${icalToken}`;

  async function copyUrl() {
    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateToken() {
    setRegenerating(true);
    try {
      const res = await apiClient.post('/calendar/regenerate-token');
      setIcalToken(res.data.icalToken as string);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="safe-top flex items-center gap-2 bg-line px-3 py-3 text-white shadow">
        <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 hover:bg-white/20">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-base font-semibold">ซิงค์ปฏิทิน</h1>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800">iCal Feed URL</h2>
          <p className="mt-1 text-sm text-gray-500">คัดลอก URL นี้ไปเพิ่มในปฏิทินของคุณ — อัปเดตทุก 5 นาที</p>
          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={feedUrl}
              className="flex-1 rounded-xl border bg-gray-50 px-3 py-2 text-xs text-gray-600 outline-none"
            />
            <button
              onClick={copyUrl}
              className="flex items-center gap-1 rounded-xl bg-line px-4 py-2 text-sm text-white font-medium"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
          </div>
        </div>

        {/* Setup guide */}
        {[
          {
            title: 'Google Calendar',
            steps: [
              'เปิด Google Calendar บนคอมพิวเตอร์',
              'กด "+" ข้าง "Other calendars"',
              'เลือก "From URL" แล้ววาง URL ด้านบน',
              'กด "Add calendar"',
            ],
          },
          {
            title: 'iPhone / iPad',
            steps: [
              'เปิด Settings → Calendar → Accounts',
              'กด "Add Account" → "Other"',
              'เลือก "Add Subscribed Calendar"',
              'วาง URL ด้านบนแล้วกด Next',
            ],
          },
        ].map((guide) => (
          <div key={guide.title} className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800">{guide.title}</h2>
            <ol className="mt-2 space-y-1.5 list-decimal list-inside">
              {guide.steps.map((s, i) => (
                <li key={i} className="text-sm text-gray-600">{s}</li>
              ))}
            </ol>
          </div>
        ))}

        {/* Regenerate token */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800">รีเซ็ต URL</h2>
          <p className="mt-1 text-sm text-gray-500">
            ถ้า URL หลุดไปยังคนอื่น ให้รีเซ็ตเพื่อยกเลิก URL เดิมทันที
          </p>
          <button
            onClick={regenerateToken}
            disabled={regenerating}
            className="mt-3 flex items-center gap-2 rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={regenerating ? 'animate-spin' : ''} />
            รีเซ็ต URL
          </button>
        </div>
      </div>
    </div>
  );
}
