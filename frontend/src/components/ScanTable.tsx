import type { ScanLog, ScanPage } from '../types'

interface Props {
  data: ScanPage | undefined
  page: number
  onPageChange: (p: number) => void
}

export default function ScanTable({ data, page, onPageChange }: Props) {
  if (!data) return <div className="text-center py-8 text-gray-500">Đang tải...</div>

  const totalPages = Math.ceil(data.total / data.page_size)

  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Thời gian</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Người quét</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Mã QR</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Tọa độ</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              data.items.map((scan: ScanLog) => (
                <tr key={scan.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{scan.scanned_at}</td>
                  <td className="px-4 py-3 font-medium">{scan.username}</td>
                  <td className="px-4 py-3 font-mono text-xs">{scan.qr_code_id}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {scan.latitude.toFixed(6)}, {scan.longitude.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{scan.ip_address}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-600">
            Tổng: {data.total} bản ghi | Trang {page}/{totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              ← Trước
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
