import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getUsers, createUser, toggleUser, resetPassword, setUploadPhotoPermission } from '../api/users'
import { useAuthStore } from '../store/authStore'
import UserForm from '../components/UserForm'
import type { UserCreate } from '../types'

export default function Users() {
  const navigate = useNavigate()
  const { clear } = useAuthStore()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [resetInfo, setResetInfo] = useState<{ username: string; password: string } | null>(null)

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => toggleUser(id, is_active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const resetMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: (data, id) => {
      const user = users?.find((u) => u.id === id)
      if (user) setResetInfo({ username: user.username, password: data.temp_password })
    },
  })

  const uploadPhotoMutation = useMutation({
    mutationFn: ({ id, can_upload_photo }: { id: string; can_upload_photo: boolean }) =>
      setUploadPhotoPermission(id, can_upload_photo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const handleCreate = async (data: UserCreate) => {
    await createMutation.mutateAsync(data)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-blue-600 hover:text-blue-800 text-sm">
              ← Quay lại Dashboard
            </button>
            <h1 className="font-bold text-gray-800">Quản lý người dùng</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium"
            >
              + Tạo tài khoản
            </button>
            <button
              onClick={() => { clear(); navigate('/login') }}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">Đang tải...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Tên đăng nhập</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Vai trò</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Trạng thái</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Chọn ảnh</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Ngày tạo</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users?.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{user.username}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        user.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.is_active ? 'Hoạt động' : 'Vô hiệu'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        user.can_upload_photo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {user.can_upload_photo ? '🖼️ Có quyền' : 'Không'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{user.created_at}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => toggleMutation.mutate({ id: user.id, is_active: !user.is_active })}
                          className={`text-xs px-2 py-1 rounded border ${
                            user.is_active
                              ? 'border-red-300 text-red-600 hover:bg-red-50'
                              : 'border-green-300 text-green-600 hover:bg-green-50'
                          }`}
                        >
                          {user.is_active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                        </button>
                        <button
                          onClick={() => uploadPhotoMutation.mutate({ id: user.id, can_upload_photo: !user.can_upload_photo })}
                          className={`text-xs px-2 py-1 rounded border ${
                            user.can_upload_photo
                              ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                              : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {user.can_upload_photo ? 'Thu hồi quyền ảnh' : 'Cấp quyền ảnh'}
                        </button>
                        <button
                          onClick={() => resetMutation.mutate(user.id)}
                          className="text-xs px-2 py-1 rounded border border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        >
                          Reset mật khẩu
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showForm && <UserForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}

      {resetInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold mb-3">Mật khẩu tạm thời</h3>
            <p className="text-sm text-gray-600 mb-3">
              Mật khẩu mới của <strong>{resetInfo.username}</strong>:
            </p>
            <div className="bg-gray-100 rounded-lg px-4 py-3 font-mono text-lg font-bold text-center tracking-widest">
              {resetInfo.password}
            </div>
            <p className="text-xs text-gray-500 mt-2">Thông báo cho người dùng đổi mật khẩu ngay.</p>
            <button
              onClick={() => setResetInfo(null)}
              className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
            >
              Đã ghi nhận
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
