import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPatrolToday, exportPatrolCsv } from '../api/qrDevices'
import { useAuthStore } from '../store/authStore'
import type { PatrolStats, DeviceStatus, DeviceTypeStats, UserScanStats } from '../types'

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type DeviceFilter = 'all' | 'scanned' | 'not_scanned'

export default function Patrol() {
  const { username, role, clear, canAccessQrDevices, canAccessDashboard } = useAuthStore()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(todayString)
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all')
  const [exporting, setExporting] = useState(false)

  const { data, isLoading, dataUpdatedAt } = useQuery<PatrolStats>({
    queryKey: ['patrol', selectedDate],
    queryFn: () => getPatrolToday(selectedDate),
    refetchInterval: selectedDate === todayString() ? 15_000 : false,
  })

  const pct = data && data.total_devices > 0
    ? Math.round((data.scanned_today / data.total_devices) * 100)
    : 0

  const lastUpdate = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('vi-VN')
    : '--:--:--'

  const isToday = selectedDate === todayString()

  const filteredDevices = (data?.devices ?? []).filter((d: DeviceStatus) => {
    if (deviceFilter === 'scanned') return d.scanned
    if (deviceFilter === 'not_scanned') return !d.scanned
    return true
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportPatrolCsv(selectedDate)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {role === 'ADMIN' || canAccessDashboard ? (
              <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</button>
            ) : canAccessQrDevices ? (
              <button onClick={() => navigate('/qr-devices')} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Quản lý QRCode →</button>
            ) : null}
            <div>
              <h1 className="font-bold text-gray-800">Tuần tra</h1>
              <p className="text-xs text-gray-500">
                Cập nhật lúc {lastUpdate}
                {isToday ? ' • tự động mỗi 15 giây' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              <strong>{username}</strong>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                role === 'ADMIN' ? 'bg-purple-100 text-purple-700'
                : role === 'GIAM_SAT' ? 'bg-amber-100 text-amber-700'
                : 'bg-blue-100 text-blue-700'
              }`}>{role}</span>
            </span>
            <button onClick={() => { clear(); navigate('/login') }} className="text-sm text-red-500 hover:text-red-700">Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Date picker + export */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-700">Chọn ngày:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayString())}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Về hôm nay
            </button>
          )}
          <span className="text-xs text-gray-500">{isToday ? '(hôm nay)' : ''}</span>
          <div className="ml-auto">
            <button
              onClick={handleExport}
              disabled={exporting || !data}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {exporting ? 'Đang xuất...' : 'Xuất CSV'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-gray-500 py-16">Đang tải...</div>
        ) : !data ? null : (
          <>
            {/* KPI overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <p className="text-sm text-gray-500 mb-1">Thiết bị đã quét</p>
                <p className="text-4xl font-bold text-blue-600">{data.scanned_today}</p>
                <p className="text-sm text-gray-400 mt-1">trên {data.total_devices} thiết bị</p>
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
                <p className="text-sm text-gray-500 mb-1">Tổng lần quét ngày này</p>
                <p className="text-4xl font-bold text-green-600">{data.scan_count_today}</p>
                <p className="text-sm text-gray-400 mt-1">lần (tính cả trùng lặp)</p>
              </div>
            </div>

            {/* KPI by device type */}
            {data.device_type_stats.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-600 mb-3">Theo loại thiết bị</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.device_type_stats.map((t: DeviceTypeStats) => {
                    const typePct = t.total > 0 ? Math.round((t.scanned / t.total) * 100) : 0
                    return (
                      <div key={t.device_type} className="bg-white rounded-xl shadow-sm p-4">
                        <div className="flex items-start justify-between mb-2">
                          <p className="font-medium text-gray-800 text-sm leading-tight">{t.device_type}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 shrink-0 ${
                            typePct === 100 ? 'bg-green-100 text-green-700'
                            : typePct >= 50 ? 'bg-blue-100 text-blue-700'
                            : 'bg-orange-100 text-orange-700'
                          }`}>
                            {typePct}%
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500 mb-2">
                          <span className="text-green-600 font-medium">{t.scanned} đã quét</span>
                          <span className="text-orange-500 font-medium">{t.not_scanned} chưa quét</span>
                          <span className="text-gray-400">/ {t.total}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${typePct === 100 ? 'bg-green-500' : typePct >= 50 ? 'bg-blue-500' : 'bg-orange-400'}`}
                            style={{ width: `${typePct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* User scan stats */}
            {data.user_stats.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b">
                  <h2 className="font-semibold text-gray-700">Thống kê người dùng</h2>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Người dùng</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Thiết bị đã quét</th>
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Tổng lần quét</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.user_stats.map((u: UserScanStats) => (
                      <tr key={u.username} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 font-medium text-gray-800">{u.username}</td>
                        <td className="px-4 py-2.5 text-right text-blue-600 font-semibold">{u.unique_devices}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{u.total_scans}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Device list with filter */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-semibold text-gray-700">Danh sách thiết bị</h2>
                <div className="flex gap-1">
                  {(['all', 'scanned', 'not_scanned'] as DeviceFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setDeviceFilter(f)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                        deviceFilter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {f === 'all' ? `Tất cả (${data.total_devices})` : f === 'scanned' ? `Đã quét (${data.scanned_today})` : `Chưa quét (${data.total_devices - data.scanned_today})`}
                    </button>
                  ))}
                </div>
              </div>
              {data.total_devices === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  Chưa có thiết bị nào.{' '}
                  {role === 'ADMIN' && (
                    <button onClick={() => navigate('/qr-devices')} className="text-blue-600 hover:underline">
                      Thêm thiết bị
                    </button>
                  )}
                </div>
              ) : filteredDevices.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Không có thiết bị nào trong bộ lọc này.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Mã TB</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Tên thiết bị</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Loại</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Vị trí</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Trạng thái</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600">Số lần</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Lần cuối</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDevices.map((d: DeviceStatus) => (
                      <tr key={d.id} className={d.scanned ? 'bg-green-50/30' : ''}>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">{d.device_id}</td>
                        <td className="px-4 py-3 text-gray-800 font-medium">{d.name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{d.device_type ?? '—'}</td>
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
