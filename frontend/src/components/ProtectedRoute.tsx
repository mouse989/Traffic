import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean
  requirePermission?: 'qr_devices' | 'patrol' | 'dashboard'
}

export default function ProtectedRoute({ children, requireAdmin = false, requirePermission }: Props) {
  const { accessToken, role, canAccessQrDevices, canAccessPatrol, canAccessDashboard } = useAuthStore()

  if (!accessToken) return <Navigate to="/login" replace />

  if (requireAdmin && role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">403 - Không có quyền truy cập</h1>
          <p className="mt-2 text-gray-600">Chỉ ADMIN mới có thể truy cập trang này.</p>
        </div>
      </div>
    )
  }

  if (requirePermission) {
    if (role === 'ADMIN') return <>{children}</>
    if (requirePermission === 'qr_devices' && role === 'GIAM_SAT' && canAccessQrDevices) return <>{children}</>
    if (requirePermission === 'patrol' && role === 'GIAM_SAT' && canAccessPatrol) return <>{children}</>
    if (requirePermission === 'dashboard' && role === 'GIAM_SAT' && canAccessDashboard) return <>{children}</>
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">403 - Không có quyền truy cập</h1>
          <p className="mt-2 text-gray-600">Bạn chưa được cấp quyền truy cập phân hệ này.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
