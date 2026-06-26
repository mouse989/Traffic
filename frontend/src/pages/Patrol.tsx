import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPatrolToday } from '../api/qrDevices'
import { useAuthStore } from '../store/authStore'
import type { PatrolStats, DeviceStatus } from '../types'

export default function Patrol() {
  const { username, role, clear } = useAuthStore()
  const navigate = useNavigate()

  const { data, isLoading, dataUpdatedAt } = useQuery<PatrolStats>({
    queryKey: ['patrol-today'],
    queryFn: getPatrolToday,
    refetchInterval: 15_000,
  })

  const pct = data && data.total_devices > 0
    ? Math.round((data.scanned_today / data.total_devices) * 100)
    : 0

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('vi-VN')
    : '--:--:--'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600">←</button>
            <div>
              <h1 className="font-bold text-gray-800">Tuần tra hôm nay</h1>
              <p className="text-xs text-gray-500">Cập nhật lúc {lastUpdate} • tự động mỗi 15 giây</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              <strong>{username}</strong>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{role}</span>
            </span>
            <button onClick={() => { clear(); navigate('/login') }} className="text-sm text-red-500 hover:text-red-700">Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="text-center text-gray-500 py-16">Đang tải...</div>
        ) : !data ? null : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-500 mb-1">Thiết bị đã quét</p>
                <p className="text-4xl font-bold text-blue-600">{data.scanned_today}</p>
                <p className="text-sm text-gray-400 mt-1">trên {data.total_devices} thiết bị</p>
                {/* Progress bar */}
                <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{pct}% hoàn thành</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-500 mb-1">Chưa quét</p>
                <p className="text-4xl font-bold text-orange-500">{data.total_devices - data.scanned_today}</p>
                <p className="text-sm text-gray-400 mt-1">thiết bị còn lại</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-500 mb-1">Tổng lần quét hôm nay</p>
                <p className="text-4xl font-bold text-green-600">{data.scan_count_today}</p>
                <p className="text-sm text-gray-400 mt-1">lần quét (tính cả trùng lặp)</p>
              </div>
            </div>

            {/* Device status table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-700">Danh sách thiết bị</h2>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Đã quét</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> Chưa quét</span>
                </div>
              </div>
              {data.total_devices === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  Chưa có thiết bị nào.{' '}
                  <button onClick={() => navigate('/qr-devices')} className="text-blue-600 hover:underline">
                    Thêm thiết bị
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Mã TB</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Tên thiết bị</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Vị trí</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Trạng thái</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Số lần</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Lần cuối</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.devices.map((d: DeviceStatus) => (
                      <tr key={d.id} className={d.scanned ? 'bg-green-50/30' : ''}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.device_id}</td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{d.name}</td>
                        <td className="px-4 py-3 text-gray-500">{d.location}</td>
                        <td className="px-4 py-3">
                          {d.scanned ? (
                            <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium">
                              ✓ Đã quét
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                              Chưa quét
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">{d.scan_count || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{d.last_scanned_at ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
