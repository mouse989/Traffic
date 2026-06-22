import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getScans } from '../api/scans'
import { useAuthStore } from '../store/authStore'
import ScanTable from '../components/ScanTable'
import ScanMap from '../components/ScanMap'

export default function Dashboard() {
  const { username, role, clear } = useAuthStore()
  const navigate = useNavigate()
  const [filterUsername, setFilterUsername] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [showMap, setShowMap] = useState(true)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['scans', filterUsername, dateFrom, dateTo, page],
    queryFn: () =>
      getScans({
        username: filterUsername || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        page_size: 50,
      }),
    refetchInterval: 15_000,
  })

  const handleLogout = () => {
    clear()
    navigate('/login')
  }

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    refetch()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📡</span>
            <div>
              <h1 className="font-bold text-gray-800">Traffic Admin</h1>
              <p className="text-xs text-gray-500">Giám sát quét mã QR thực địa</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {role === 'ADMIN' && (
              <button
                onClick={() => navigate('/users')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Quản lý người dùng
              </button>
            )}
            <span className="text-sm text-gray-600">
              Xin chào, <strong>{username}</strong>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                {role}
              </span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Filter bar */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tên đăng nhập</label>
              <input
                type="text"
                value={filterUsername}
                onChange={(e) => setFilterUsername(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
                placeholder="Tất cả"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Từ ngày</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Đến ngày</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium"
            >
              Lọc
            </button>
            <button
              type="button"
              onClick={() => { setFilterUsername(''); setDateFrom(''); setDateTo(''); setPage(1) }}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50 font-medium"
            >
              Xóa bộ lọc
            </button>
            {isLoading && <span className="text-sm text-gray-500">Đang tải...</span>}
            {data && <span className="text-sm text-gray-500">Tổng: {data.total} bản ghi</span>}
          </form>
        </div>

        {/* Map */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">Bản đồ vị trí quét</h2>
            <button
              onClick={() => setShowMap(!showMap)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showMap ? 'Ẩn bản đồ' : 'Hiện bản đồ'}
            </button>
          </div>
          {showMap && <ScanMap scans={data?.items ?? []} />}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-semibold text-gray-700 mb-3">Chi tiết lần quét</h2>
          <ScanTable data={data} page={page} onPageChange={setPage} />
        </div>
      </main>
    </div>
  )
}
