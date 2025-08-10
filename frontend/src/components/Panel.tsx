import React from 'react'

export default function Panel({ title, actions, children, className = '' }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-700/30 bg-card shadow-lg ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-slate-700/30 p-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}
