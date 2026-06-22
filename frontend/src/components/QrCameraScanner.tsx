import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser'

interface Props {
  onDetect: (qrCodeId: string) => void
  active: boolean  // false = pause scanning (during challenge/submit flow)
}

export default function QrCameraScanner({ onDetect, active }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const readerRef = useRef<BrowserQRCodeReader | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const activeRef = useRef(active)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 300,
    })
    readerRef.current = reader

    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: 'environment', // back camera on mobile
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    }

    reader
      .decodeFromConstraints(constraints, videoRef.current!, (result, error, controls) => {
        if (controlsRef.current === null) {
          controlsRef.current = controls
        }
        if (result && activeRef.current) {
          onDetect(result.getText())
        }
        // Ignore decode errors (normal during scanning)
        void error
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.toLowerCase().includes('permission')) {
          setCameraError('Trình duyệt không có quyền truy cập camera. Vui lòng cấp quyền và tải lại trang.')
        } else if (msg.toLowerCase().includes('https') || msg.toLowerCase().includes('secure')) {
          setCameraError('Camera yêu cầu kết nối HTTPS. Vui lòng truy cập qua HTTPS hoặc localhost.')
        } else {
          setCameraError(`Không thể mở camera: ${msg}`)
        }
      })

    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTorch = async () => {
    try {
      const stream = videoRef.current?.srcObject as MediaStream | null
      const track = stream?.getVideoTracks()[0]
      if (!track) return
      const newState = !torchOn
      // @ts-expect-error - torch is not in standard TS types yet
      await track.applyConstraints({ advanced: [{ torch: newState }] })
      setTorchOn(newState)
    } catch {
      // Torch not supported on this device/browser
    }
  }

  if (cameraError) {
    return (
      <div className="flex items-center justify-center bg-gray-900 rounded-xl" style={{ minHeight: '55vw', maxHeight: '60vh' }}>
        <div className="text-center px-6">
          <div className="text-4xl mb-3">📷</div>
          <p className="text-white text-sm leading-relaxed">{cameraError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ minHeight: '55vw', maxHeight: '60vh' }}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ minHeight: '55vw', maxHeight: '60vh' }}
        muted
        playsInline  // Required for iOS Safari autoplay
      />

      {/* Viewfinder overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="border-2 border-white rounded-xl"
          style={{ width: '60%', aspectRatio: '1' }}
        >
          {/* Corner highlights */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
        </div>
      </div>

      {/* Scanning label */}
      {active && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <span className="bg-black/60 text-white text-xs px-3 py-1 rounded-full">
            Hướng camera vào mã QR
          </span>
        </div>
      )}

      {/* Paused overlay */}
      {!active && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <span className="text-white text-sm bg-black/60 px-4 py-2 rounded-full">
            Đang xử lý...
          </span>
        </div>
      )}

      {/* Torch button (top-right) */}
      <button
        onClick={toggleTorch}
        className="absolute top-3 right-3 bg-black/50 text-white rounded-full p-2 text-lg"
        title={torchOn ? 'Tắt đèn' : 'Bật đèn'}
      >
        {torchOn ? '🔦' : '💡'}
      </button>
    </div>
  )
}
