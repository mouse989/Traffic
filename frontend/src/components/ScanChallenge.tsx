import { useEffect, useRef, useState } from 'react'

interface Props {
  onSuccess: () => void
  onCancel: () => void
}

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No ambiguous: 0,O,1,I

function generateChar(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return CHARS[array[0] % CHARS.length]
}

export default function ScanChallenge({ onSuccess, onCancel }: Props) {
  const [challenge, setChallenge] = useState(() => generateChar())
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus input when dialog opens
    const timer = setTimeout(() => inputRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Re-focus when challenge changes (after wrong answer)
    inputRef.current?.focus()
  }, [challenge])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value.toUpperCase().slice(-1) // only last char
    if (!value) return

    if (value === challenge) {
      onSuccess()
    } else {
      // Wrong answer: generate NEW challenge, clear input
      setChallenge(generateChar())
      setError('Sai ký tự. Nhập ký tự mới hiển thị bên trên.')
      e.target.value = ''
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-white font-bold text-center text-lg">Xác nhận hiện diện</h2>
          <p className="text-blue-100 text-xs text-center mt-1">
            Nhập ký tự bên dưới để tiếp tục
          </p>
        </div>

        <div className="px-6 pt-6 pb-8">
          {/* Big challenge character */}
          <div className="flex justify-center mb-6">
            <div
              className="w-32 h-32 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg"
              style={{ boxShadow: '0 8px 32px rgba(37,99,235,0.4)' }}
            >
              <span
                className="text-white font-bold select-none"
                style={{ fontSize: 80, lineHeight: 1, fontFamily: 'monospace' }}
              >
                {challenge}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Input field */}
          <input
            ref={inputRef}
            type="text"
            maxLength={1}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            onChange={handleInput}
            className="w-full border-2 border-gray-300 rounded-xl px-4 py-4 text-center focus:outline-none focus:border-blue-500 transition-colors"
            style={{ fontSize: 36, fontWeight: 700, fontFamily: 'monospace', letterSpacing: 8 }}
            placeholder="?"
          />

          <p className="text-gray-400 text-xs text-center mt-3">
            Nhập đúng 1 ký tự để tự động xác nhận
          </p>

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="w-full mt-4 py-3 border border-gray-300 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}
