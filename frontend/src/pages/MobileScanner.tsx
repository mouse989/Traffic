import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { submitScan } from '../api/scans'
import { validateQrCode } from '../api/qrDevices'
import QrCameraScanner from '../components/QrCameraScanner'
import ScanChallenge from '../components/ScanChallenge'
import type { ScanLog } from '../types'

type Stage =
  | 'IDLE'        // Camera active, waiting for QR
  | 'VALIDATING'  // QR detected, checking against device registry
  | 'CHALLENGE'   // QR valid, showing 1-char challenge
  | 'GPS'         // Challenge passed, getting GPS
  | 'SUBMITTING'  // GPS obtained, sending to server
  | 'SUCCESS'     // Scan submitted successfully
  | 'ERROR'       // Something went wrong

export default function MobileScanner() {
  const { username, role, clear, canUploadPhoto, canAccessDashboard } = useAuthStore()
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage>('IDLE')
  const [pendingQrId, setPendingQrId] = useState<string | null>(null)
  const [lastScan, setLastScan] = useState<ScanLog | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [gpsAccuracyWarning, setGpsAccuracyWarning] = useState<string | null>(null)

  const handleQrDetected = useCallback(async (qrCodeId: string) => {
    if (stage !== 'IDLE') return
    setPendingQrId(qrCodeId)
    setStage('VALIDATING')
    try {
      await validateQrCode(qrCodeId)
      setStage('CHALLENGE')
    } catch {
      setErrorMsg('Mã QR không hợp lệ hoặc chưa được đăng ký trong hệ thống.')
      setStage('ERROR')
    }
  }, [stage])

  const handleChallengeSuccess = () => {
    setStage('GPS')
    captureGps()
  }

  const handleChallengeCancel = () => {
    setPendingQrId(null)
    setStage('IDLE')
  }

  function captureGps() {
    if (!navigator.geolocation) {
      setErrorMsg('Trình duyệt không hỗ trợ định vị GPS.')
      setStage('ERROR')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords
        let warning: string | null = null

        if (accuracy === 0) {
          warning = 'GPS bất thường (độ chính xác = 0). Có thể đang dùng fake GPS.'
        } else if (accuracy > 100) {
          warning = `GPS yếu (±${Math.round(accuracy)}m). Thử di chuyển ra ngoài trời.`
        }
        setGpsAccuracyWarning(warning)
        handleSubmit(latitude, longitude)
      },
      (err) => {
        const messages: Record<number, string> = {
          1: 'Trình duyệt không có quyền truy cập vị trí. Vui lòng cấp quyền.',
          2: 'Không thể lấy vị trí GPS. Vui lòng thử lại.',
          3: 'Hết thời gian chờ GPS. Vui lòng thử lại ở nơi thoáng.',
        }
        setErrorMsg(messages[err.code] ?? 'Lỗi GPS không xác định.')
        setStage('ERROR')
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    )
  }

  async function handleSubmit(latitude: number, longitude: number) {
    if (!pendingQrId) return
    setStage('SUBMITTING')

    try {
      const result = await submitScan({ qr_code_id: pendingQrId, latitude, longitude })
      setLastScan(result)
      setStage('SUCCESS')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail
      setErrorMsg(detail ?? 'Không thể gửi dữ liệu. Kiểm tra kết nối mạng.')
      setStage('ERROR')
    }
  }

  function resetToIdle() {
    setPendingQrId(null)
    setErrorMsg(null)
    setGpsAccuracyWarning(null)
    setStage('IDLE')
  }

  const handleLogout = () => {
    clear()
    navigate('/login')
  }

  const isScanning = stage === 'IDLE' || stage === 'SUCCESS' || stage === 'ERROR' || stage === 'VALIDATING'

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">📡</span>
          <div>
            <p className="text-white text-sm font-semibold leading-none">Traffic Mobile</p>
            <p className="text-gray-400 text-xs mt-0.5">{username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(role === 'ADMIN' || canAccessDashboard) && (
            <button
              onClick={() => navigate('/dashboard')}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Dashboard
            </button>
          )}
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-red-400"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Camera Scanner */}
      <div className="px-3 pt-3 flex-shrink-0">
        <QrCameraScanner
          onDetect={handleQrDetected}
          active={isScanning}
          canUploadPhoto={role === 'ADMIN' || canUploadPhoto}
        />
      </div>

      {/* Status Panel */}
      <div className="flex-1 px-3 py-3 space-y-3 overflow-y-auto">

        {/* Validating QR */}
        {stage === 'VALIDATING' && (
          <div className="bg-indigo-900/50 border border-indigo-700 rounded-xl p-4 flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <p className="text-indigo-200 text-sm font-medium">Đang kiểm tra mã QR...</p>
          </div>
        )}

        {/* GPS loading / Submitting */}
        {(stage === 'GPS' || stage === 'SUBMITTING') && (
          <div className="bg-blue-900/50 border border-blue-700 rounded-xl p-4 flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            <div>
              <p className="text-blue-200 text-sm font-medium">
                {stage === 'GPS' ? 'Đang lấy vị trí GPS...' : 'Đang gửi dữ liệu...'}
              </p>
              {stage === 'GPS' && pendingQrId && (
                <p className="text-blue-400 text-xs mt-0.5">QR: {pendingQrId}</p>
              )}
            </div>
          </div>
        )}

        {/* Success */}
        {stage === 'SUCCESS' && lastScan && (
          <div className="bg-green-900/50 border border-green-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-400 text-lg">✓</span>
                <p className="text-green-300 font-semibold text-sm">Quét thành công!</p>
              </div>
              <button
                onClick={resetToIdle}
                className="text-green-400 hover:text-green-200 text-xs border border-green-600 px-2 py-1 rounded-lg"
              >
                Quét tiếp
              </button>
            </div>
            {gpsAccuracyWarning && (
              <div className="mb-2 px-3 py-2 bg-yellow-900/50 border border-yellow-700 rounded-lg">
                <p className="text-yellow-300 text-xs">⚠ {gpsAccuracyWarning}</p>
              </div>
            )}
            <div className="space-y-1 text-xs font-mono">
              <div className="flex gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">QR:</span>
                <span className="text-white break-all">{lastScan.qr_code_id}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">GPS:</span>
                <span className="text-white">
                  {lastScan.latitude.toFixed(6)}, {lastScan.longitude.toFixed(6)}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">Thời gian:</span>
                <span className="text-white">{lastScan.scanned_at}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-400 w-16 flex-shrink-0">IP:</span>
                <span className="text-white">{lastScan.ip_address}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {stage === 'ERROR' && (
          <div className="bg-red-900/50 border border-red-700 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-red-400 text-lg">✗</span>
                <p className="text-red-300 font-semibold text-sm">Có lỗi xảy ra</p>
              </div>
              <button
                onClick={resetToIdle}
                className="text-red-400 hover:text-red-200 text-xs border border-red-600 px-2 py-1 rounded-lg"
              >
                Thử lại
              </button>
            </div>
            {errorMsg && <p className="text-red-200 text-sm">{errorMsg}</p>}
          </div>
        )}

        {/* Idle hint */}
        {stage === 'IDLE' && (
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-gray-500 text-xs text-center">
              Hướng camera vào mã QR để bắt đầu quét
            </p>
            {lastScan && (
              <p className="text-gray-600 text-xs text-center mt-1">
                Lần cuối: {lastScan.qr_code_id} lúc {lastScan.scanned_at}
              </p>
            )}
          </div>
        )}

        {/* HTTPS notice */}
        <div className="bg-gray-900 rounded-xl p-3">
          <p className="text-gray-600 text-xs text-center">
            ⚠ Camera yêu cầu kết nối HTTPS trong môi trường production
          </p>
        </div>
      </div>

      {/* Challenge overlay - rendered last so it appears on top */}
      {stage === 'CHALLENGE' && (
        <ScanChallenge
          onSuccess={handleChallengeSuccess}
          onCancel={handleChallengeCancel}
        />
      )}
    </div>
  )
}
