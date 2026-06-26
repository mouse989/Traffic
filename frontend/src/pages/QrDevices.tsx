import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { getQrDevices, createQrDevice, deleteQrDevice, importQrDevicesCsv } from '../api/qrDevices'
import { useAuthStore } from '../store/authStore'
import type { QrDevice } from '../types'

export default function QrDevices() {
  const { username, role, clear } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ device_id: '', name: '', location: '', notes: '', qr_text: '' })
  const [formError, setFormError] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['qr-devices'],
    queryFn: getQrDevices,
  })

  const createMut = useMutation({
    mutationFn: createQrDevice,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['qr-devices'] }); setShowForm(false); setForm({ device_id: '', name: '', location: '', notes: '', qr_text: '' }) },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setFormError(msg ?? 'Không thể tạo thiết bị')
    },
  })

  const deleteMut = useMutation({
    mutationFn: deleteQrDevice,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['qr-devices'] }),
  })

  const importMut = useMutation({
    mutationFn: importQrDevicesCsv,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['qr-devices'] })
      setImportMsg(`Đã import: ${res.created} thiết bị (bỏ qua: ${res.skipped})`)
      setTimeout(() => setImportMsg(''), 5000)
    },
  })

  async function exportPdf() {
    if (devices.length === 0) return
    setPdfLoading(true)
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const marginX = 5, marginY = 5
      const cellW = 40, cellH = 40
      const cols = 5
      const qrSize = 30
      const textY = marginY + qrSize + 3

      for (let i = 0; i < devices.length; i++) {
        const device = devices[i]
        const col = i % cols
        const row = Math.floor(i % 35 / cols)
        const x = marginX + col * cellW
        const y = marginY + row * cellH

        if (i > 0 && i % 35 === 0) pdf.addPage()

        const dataUrl = await QRCode.toDataURL(device.qr_text, { width: 200, margin: 1 })
        pdf.addImage(dataUrl, 'PNG', x + 5, y + 2, qrSize, qrSize)

        pdf.setFontSize(6)
        const label = device.qr_text.length > 20 ? device.qr_text.slice(0, 20) + '…' : device.qr_text
        const nameLabel = device.name.length > 18 ? device.name.slice(0, 18) + '…' : device.name
        pdf.text(label, x + cellW / 2, y + textY, { align: 'center' })
        pdf.text(nameLabel, x + cellW / 2, y + textY + 3, { align: 'center' })

        pdf.setDrawColor(200)
        pdf.rect(x, y, cellW, cellH)
      }

      pdf.save('qrcode-list.pdf')
    } finally {
      setPdfLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.device_id.trim() || !form.name.trim() || !form.location.trim() || !form.qr_text.trim()) {
      setFormError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }
    createMut.mutate({ ...form, notes: form.notes || null })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    importMut.mutate(file)
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-gray-600">←</button>
            <div>
              <h1 className="font-bold text-gray-800">Quản lý QRCode</h1>
              <p className="text-xs text-gray-500">Danh sách thiết bị cần quét</p>
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

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => { setShowForm(true); setFormError('') }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium"
          >
            + Thêm thiết bị
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 font-medium"
          >
            Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          <button
            onClick={exportPdf}
            disabled={pdfLoading || devices.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 font-medium disabled:opacity-50"
          >
            {pdfLoading ? 'Đang tạo PDF...' : 'Xuất PDF'}
          </button>
          {importMsg && <span className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-lg">{importMsg}</span>}
          {importMut.isPending && <span className="text-sm text-gray-500">Đang import...</span>}
          <span className="text-sm text-gray-500 ml-auto">{devices.length} thiết bị</span>
        </div>

        {/* CSV format hint */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
          <p className="text-xs text-blue-700">
            Định dạng CSV: <code className="font-mono bg-blue-100 px-1 rounded">device_id,name,location,notes,qr_text</code>
            &nbsp;(notes không bắt buộc)
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Đang tải...</div>
          ) : devices.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Chưa có thiết bị nào. Thêm mới hoặc import CSV.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Mã TB</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tên thiết bị</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Vị trí</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Chuỗi QR</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ghi chú</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {devices.map((d: QrDevice) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-800">{d.device_id}</td>
                    <td className="px-4 py-3 text-gray-800">{d.name}</td>
                    <td className="px-4 py-3 text-gray-600">{d.location}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700 max-w-xs truncate">{d.qr_text}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.notes ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => { if (confirm(`Xóa thiết bị "${d.name}"?`)) deleteMut.mutate(d.id) }}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Add device modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Thêm thiết bị mới</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: 'Mã thiết bị *', key: 'device_id', placeholder: 'VD: DEV-001' },
                { label: 'Tên thiết bị *', key: 'name', placeholder: 'VD: Máy bơm tầng 3' },
                { label: 'Vị trí/Địa điểm *', key: 'location', placeholder: 'VD: Tòa A - Tầng 3' },
                { label: 'Chuỗi text QRCode *', key: 'qr_text', placeholder: 'VD: QR_DEV001_2024' },
                { label: 'Ghi chú', key: 'notes', placeholder: 'Không bắt buộc' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="text"
                    value={form[key as keyof typeof form] ?? ''}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              {formError && <p className="text-red-600 text-sm">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={createMut.isPending} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  {createMut.isPending ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
