import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastVariant = 'info' | 'success' | 'warning' | 'error'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, durationMs?: number) => number
  dismissToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [counter, setCounter] = useState(1)

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback((message: string, variant: ToastVariant = 'info', durationMs = 4000) => {
    const id = counter
    setCounter((c) => c + 1)
    setToasts((prev) => [...prev, { id, message, variant }])
    if (durationMs > 0) {
      window.setTimeout(() => dismissToast(id), durationMs)
    }
    return id
  }, [counter, dismissToast])

  const value = useMemo<ToastContextValue>(() => ({ showToast, dismissToast }), [showToast, dismissToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const style =
            t.variant === 'success' ? 'bg-emerald-500 text-black' :
            t.variant === 'warning' ? 'bg-amber-500 text-black' :
            t.variant === 'error' ? 'bg-red-500 text-white' :
            'bg-slate-800 text-white'
          return (
            <div key={t.id} className={`pointer-events-auto rounded-md px-4 py-3 shadow-lg ring-1 ring-black/20 ${style}`}>
              <div className="text-sm font-medium">{t.message}</div>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}


