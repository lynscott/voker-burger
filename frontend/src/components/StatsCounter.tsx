import React from 'react'

export default function StatsCounter({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="stats-counter relative overflow-hidden rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      <div className="flex flex-col items-center space-y-2">
        <div className="text-3xl" aria-hidden>
          {icon}
        </div>
        <div className="counter-value relative h-12 w-full overflow-hidden text-center">
          <span className="text-4xl font-bold tabular-nums">{value}</span>
        </div>
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
      </div>
    </div>
  )
}
