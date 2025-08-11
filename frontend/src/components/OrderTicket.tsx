import { useMemo } from 'react'
import type { Order } from '../types/orders'

export default function OrderTicket({ order }: { order: Order }) {
  const formattedItems = useMemo(() => (order.details?.map(i => `${i.qty}x ${i.item}`).join(', ') || 'No items'), [order.details])
  const isActive = order.status === 'PLACED'
  const formattedTime = useMemo(() => {
    const d = order.created_at ? new Date(order.created_at + 'Z') : null
    return d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Invalid date'
  }, [order.created_at])

  return (
    <div className={`order-ticket relative mb-3 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200 ${isActive ? '' : 'opacity-70'}`}>
      <div className="absolute right-1 top-1">
        <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-500'} shadow`} />
      </div>
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="rotate-12 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs font-bold uppercase text-gray-300">Cancelled</div>
        </div>
      )}
      <div className="p-3">
        <div className="flex justify-between">
          <div className="font-bold">Order #{order.id}</div>
          <div className="text-sm text-muted-foreground">{formattedTime}</div>
        </div>
        <div className="mt-2 text-sm"><span className="font-medium">Items:</span> {formattedItems}</div>
        <div className="mt-1 text-sm"><span className="font-medium">Total items:</span> {order.total_items}</div>
      </div>
    </div>
  )
}
