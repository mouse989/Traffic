import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import MobileScanner from './pages/MobileScanner'
import QrDevices from './pages/QrDevices'
import Patrol from './pages/Patrol'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuthStore } from './store/authStore'

const qc = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 10_000 },
  },
})

function RootRedirect() {
  const { role, canAccessDashboard, canAccessPatrol, canAccessQrDevices } = useAuthStore()
  if (role === 'ADMIN') return <Navigate to="/dashboard" replace />
  if (role === 'GIAM_SAT') {
    if (canAccessDashboard) return <Navigate to="/dashboard" replace />
    if (canAccessPatrol) return <Navigate to="/patrol" replace />
    if (canAccessQrDevices) return <Navigate to="/qr-devices" replace />
    return <Navigate to="/mobile" replace />
  }
  return <Navigate to="/mobile" replace />
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requirePermission="dashboard">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute requireAdmin>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr-devices"
            element={
              <ProtectedRoute requirePermission="qr_devices">
                <QrDevices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patrol"
            element={
              <ProtectedRoute requirePermission="patrol">
                <Patrol />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile"
            element={
              <ProtectedRoute>
                <MobileScanner />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
