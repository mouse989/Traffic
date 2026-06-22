import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { accessToken, role } = useAuthStore()

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

  return <>{children}</>
}
