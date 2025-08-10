import React, { useEffect, useRef, useState } from 'react'

export default function StatsCounter({ icon, label, value }: { icon: string; label: string; value: number }) {
  const prev = useRef(value)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const start = prev.current
    const end = value
    if (start === end) return
    const duration = 500
    const startTs = performance.now()
    let raf = 0
    const step = (ts: number) => {
      const t = Math.min(1, (ts - startTs) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(start + (end - start) * eased)
      setDisplay(current)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    prev.current = end
    return () => cancelAnimationFrame(raf)
  }, [value])

  return (
    <div className="stats-counter relative overflow-hidden rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex flex-col items-center space-y-2">
        <div className="text-3xl" aria-hidden>
          {icon}
        </div>
        <div className="counter-value relative h-12 w-full overflow-hidden text-center">
          <span className="text-4xl font-bold tabular-nums">{display}</span>
        </div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}
