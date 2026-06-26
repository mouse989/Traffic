import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import {
  getQrDevices, createQrDevice, updateQrDevice, deleteQrDevice,
  importQrDevicesCsv, downloadCsvTemplate,
  getDeviceFieldConfigs, createDeviceFieldConfig, deleteDeviceFieldConfig,
} from '../api/qrDevices'
import { useAuthStore } from '../store/authStore'
import type { QrDevice, DeviceFieldConfig } from '../types'

type Tab = 'devices' | 'fields'

interface DeviceFormState {
  device_id: string
  name: string
  location: string
  notes: string
  qr_text: string
  device_type: string
  [key: string]: string
}

export default function QrDevices() {
  const { username, role, clear } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('devices')
  const [showForm, setShowForm] = useState(false)
  const [editingDevice, setEditingDevice] = useState<QrDevice | null>(null)
  const [form, setForm] = useState<DeviceFormState>({
    device_id: '', name: '', location: '', notes: '', qr_text: '', device_type: '',
  })
  const [formError, setFormError] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const [newField, setNewField] = useState({ field_name: '', label: '', required: false, sort_order: 0 })
  const [fieldError, setFieldError] = useState('')

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ['qr-devices'],
    queryFn: getQrDevices,
  })

  const { data: fieldConfigs = [] } = useQuery<DeviceFieldConfig[]>({
    queryKey: ['device-field-configs'],
    queryFn: getDeviceFieldConfigs,
  })

  const createMut = useMutation({
    mutationFn: createQrDevice,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qr-devices'] })
      setShowForm(false)
      resetForm()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setFormError(msg ?? 'Không thể tạo thiết bị')
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<QrDevice, 'id' | 'device_id' | 'created_at'>> }) =>
      updateQrDevice(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qr-devices'] })
      setEditingDevice(null)
      resetForm()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setFormError(msg ?? 'Không thể cập nhật thiết bị')
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

  const createFieldMut = useMutation({
    mutationFn: createDeviceFieldConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['device-field-configs'] })
      setNewField({ field_name: '', label: '', required: false, sort_order: 0 })
      setFieldError('')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setFieldError(msg ?? 'Không thể tạo trường')
    },
  })

  const deleteFieldMut = useMutation({
    mutationFn: deleteDeviceFieldConfig,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-field-configs'] }),
  })

  function resetForm() {
    const base: DeviceFormState = { device_id: '', name: '', location: '', notes: '', qr_text: '', device_type: '' }
    fieldConfigs.forEach((f) => { base[f.field_name] = '' })
    setForm(base)
    setFormError('')
  }

  function openCreate() {
    setEditingDevice(null)
    resetForm()
    setShowForm(true)
  }

  function openEdit(d: QrDevice) {
    setEditingDevice(d)
    const base: DeviceFormState = {
      device_id: d.device_id,
      name: d.name,
      location: d.location,
      notes: d.notes ?? '',
      qr_text: d.qr_text,
      device_type: d.device_type ?? '',
    }
    fieldConfigs.forEach((f) => {
      base[f.field_name] = d.extra_data?.[f.field_name] ?? ''
    })
    setForm(base)
    setFormError('')
    setShowForm(true)
  }

  async function exportPdf() {
    if (devices.length === 0) return
    setPdfLoading(true)
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const marginX = 5, marginY = 5
      const cellW = 40, cellH = 40
      const cols = 5
      const qrSize = 30

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
        pdf.text(label, x + cellW / 2, y + qrSize + 5, { align: 'center' })
        pdf.text(nameLabel, x + cellW / 2, y + qrSize + 8, { align: 'center' })

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
    if (!form.name.trim() || !form.location.trim() || !form.qr_text.trim()) {
      setFormError('Vui lòng điền đầy đủ thông tin bắt buộc')
      return
    }
    if (!editingDevice && !form.device_id.trim()) {
      setFormError('Vui lòng điền mã thiết bị')
      return
    }
    for (const fc of fieldConfigs) {
      if (fc.required && !form[fc.field_name]?.trim()) {
        setFormError(`Trường "${fc.label}" là bắt buộc`)
        return
      }
    }
    const extra: Record<string, string> = {}
    fieldConfigs.forEach((fc) => {
      const val = form[fc.field_name]?.trim()
      if (val) extra[fc.field_name] = val
    })
    const extraData = Object.keys(extra).length > 0 ? extra : null

    if (editingDevice) {
      updateMut.mutate({
        id: editingDevice.id,
        data: {
          name: form.name.trim(),
          location: form.location.trim(),
          notes: form.notes.trim() || null,
          qr_text: form.qr_text.trim(),
          device_type: form.device_type.trim() || null,
          extra_data: extraData,
        },
      })
    } else {
      createMut.mutate({
        device_id: form.device_id.trim(),
        name: form.name.trim(),
        location: form.location.trim(),
        notes: form.notes.trim() || null,
        qr_text: form.qr_text.trim(),
        device_type: form.device_type.trim() || null,
        extra_data: extraData,
      })
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    importMut.mutate(file)
    e.target.value = ''
  }

  function handleAddField(e: React.FormEvent) {
    e.preventDefault()
    setFieldError('')
    if (!newField.field_name.trim() || !newField.label.trim()) {
      setFieldError('Điền đầy đủ tên trường và nhãn')
      return
    }
    createFieldMut.mutate(newField)
  }

  const isSubmitting = createMut.isPending || updateMut.isPending
  const homeRoute = role === 'ADMIN' ? '/dashboard' : '/'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(homeRoute)} className="text-gray-400 hover:text-gray-600">←</button>
            <div>
              <h1 className="font-bold text-gray-800">Quản lý QRCode</h1>
              <p className="text-xs text-gray-500">Danh sách thiết bị cần quét</p>
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

        <div className="max-w-7xl mx-auto px-4 flex gap-0 border-t">
          <button
            onClick={() => setTab('devices')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'devices' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Thiết bị
          </button>
          <button
            onClick={() => setTab('fields')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'fields' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Cấu hình trường
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {tab === 'devices' && (
          <>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={openCreate}
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
                onClick={() => downloadCsvTemplate()}
                className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 font-medium text-gray-600"
              >
                Tải template CSV
              </button>
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

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center text-gray-500">Đang tải...</div>
              ) : devices.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Chưa có thiết bị nào. Thêm mới hoặc import CSV.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Mã TB</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Tên thiết bị</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Loại</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Vị trí</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Chuỗi QR</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Ghi chú</th>
                        {fieldConfigs.map((fc) => (
                          <th key={fc.field_name} className="text-left px-4 py-3 font-medium text-gray-600">{fc.label}</th>
                        ))}
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {devices.map((d: QrDevice) => (
                        <tr key={d.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-800">{d.device_id}</td>
                          <td className="px-4 py-3 text-gray-800">{d.name}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{d.device_type ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{d.location}</td>
                          <td className="px-4 py-3 font-mono text-xs text-blue-700 max-w-xs truncate">{d.qr_text}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{d.notes ?? '—'}</td>
                          {fieldConfigs.map((fc) => (
                            <td key={fc.field_name} className="px-4 py-3 text-xs text-gray-600">
                              {d.extra_data?.[fc.field_name] ?? '—'}
                            </td>
                          ))}
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEdit(d)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => { if (confirm(`Xóa thiết bị "${d.name}"?`)) deleteMut.mutate(d.id) }}
                                className="text-red-500 hover:text-red-700 text-xs"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'fields' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
              Cấu hình các trường tùy chỉnh bổ sung cho thiết bị. Các trường này sẽ xuất hiện trong form thêm/sửa thiết bị và file template CSV.
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Thêm trường mới</h3>
              <form onSubmit={handleAddField} className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tên trường (slug) *</label>
                  <input
                    type="text"
                    value={newField.field_name}
                    onChange={(e) => setNewField(f => ({ ...f, field_name: e.target.value }))}
                    placeholder="vd: serial_number"
                    className="border rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nhãn hiển thị *</label>
                  <input
                    type="text"
                    value={newField.label}
                    onChange={(e) => setNewField(f => ({ ...f, label: e.target.value }))}
                    placeholder="vd: Số Serial"
                    className="border rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Thứ tự</label>
                  <input
                    type="number"
                    value={newField.sort_order}
                    onChange={(e) => setNewField(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    className="border rounded-lg px-3 py-2 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2 pb-0.5">
                  <input
                    type="checkbox"
                    id="req"
                    checked={newField.required}
                    onChange={(e) => setNewField(f => ({ ...f, required: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <label htmlFor="req" className="text-sm text-gray-700 cursor-pointer">Bắt buộc</label>
                </div>
                <button
                  type="submit"
                  disabled={createFieldMut.isPending}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {createFieldMut.isPending ? 'Đang lưu...' : '+ Thêm trường'}
                </button>
              </form>
              {fieldError && <p className="text-red-600 text-sm mt-2">{fieldError}</p>}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-700">Các trường đã cấu hình</h3>
              </div>
              {fieldConfigs.length === 0 ? (
                <div className="p-8 text-center text-gray-400">Chưa có trường tùy chỉnh nào.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Tên trường</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Nhãn</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Bắt buộc</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Thứ tự</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fieldConfigs.map((fc: DeviceFieldConfig) => (
                      <tr key={fc.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-800">{fc.field_name}</td>
                        <td className="px-4 py-3 text-gray-800">{fc.label}</td>
                        <td className="px-4 py-3">
                          {fc.required ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Bắt buộc</span>
                          ) : (
                            <span className="text-xs text-gray-400">Không</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{fc.sort_order}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { if (confirm(`Xóa trường "${fc.label}"? Dữ liệu đã nhập không bị xóa.`)) deleteFieldMut.mutate(fc.id) }}
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
          </div>
        )}
      </main>

      {/* Create/Edit device modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowForm(false); setEditingDevice(null) }} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {editingDevice ? `Sửa thiết bị: ${editingDevice.device_id}` : 'Thêm thiết bị mới'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {!editingDevice && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mã thiết bị *</label>
                  <input
                    type="text"
                    value={form.device_id}
                    onChange={(e) => setForm(f => ({ ...f, device_id: e.target.value }))}
                    placeholder="VD: DEV-001"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              {[
                { label: 'Tên thiết bị *', key: 'name', placeholder: 'VD: Máy bơm tầng 3' },
                { label: 'Loại thiết bị', key: 'device_type', placeholder: 'VD: Máy bơm, Đèn chiếu sáng...' },
                { label: 'Vị trí/Địa điểm *', key: 'location', placeholder: 'VD: Tòa A - Tầng 3' },
                { label: 'Chuỗi text QRCode *', key: 'qr_text', placeholder: 'VD: QR_DEV001_2024' },
                { label: 'Ghi chú', key: 'notes', placeholder: 'Không bắt buộc' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type="text"
                    value={form[key] ?? ''}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              {fieldConfigs.map((fc) => (
                <div key={fc.field_name}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {fc.label}{fc.required ? ' *' : ''}
                  </label>
                  <input
                    type="text"
                    value={form[fc.field_name] ?? ''}
                    onChange={(e) => setForm(f => ({ ...f, [fc.field_name]: e.target.value }))}
                    placeholder={fc.required ? 'Bắt buộc' : 'Không bắt buộc'}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              {formError && <p className="text-red-600 text-sm">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {isSubmitting ? 'Đang lưu...' : editingDevice ? 'Cập nhật' : 'Lưu'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingDevice(null) }}
                  className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50"
                >
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
