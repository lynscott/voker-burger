import React from 'react'
import { useOrders } from '../hooks/useOrders'
import OrderTicket from './OrderTicket'

export default function OrderBoard() {
  const { orders, isLoading, isError, error, refetch } = useOrders()

  return (
    <div className="order-board flex h-full w-full flex-col rounded-lg border bg-card shadow-sm">
      <div className="flex-none border-b p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Order History</h2>
        <button onClick={() => refetch()} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" disabled={isLoading} aria-label="Refresh orders">
          <span className={`text-lg ${isLoading ? 'animate-spin' : ''}`}>⟳</span>
        </button>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        {isLoading && orders.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <div className="mb-2 text-2xl animate-spin">⟳</div>
              <p>Loading orders...</p>
            </div>
          </div>
        )}
        {isError && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-red-500">
              <p className="mb-2">Failed to load orders</p>
              <p className="text-sm">{(error as Error)?.message}</p>
              <button onClick={() => refetch()} className="mt-4 rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90">Try Again</button>
            </div>
          </div>
        )}
        {!isLoading && !isError && orders.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p>No orders yet</p>
              <p className="mt-1 text-sm">Use the intercom to place an order</p>
            </div>
          </div>
        )}
        {!isLoading && !isError && orders.length > 0 && (
          <div className="h-full overflow-y-auto pr-1">
            {orders.map(order => <OrderTicket key={order.id} order={order} />)}
          </div>
        )}
      </div>
    </div>
  )
}
