import React from 'react'
import { useOrders } from '../hooks/useOrders'
import OrderTicket from './OrderTicket'
import Panel from './Panel'
import { motion, AnimatePresence } from 'framer-motion'

export default function OrderBoard() {
  const { orders, isLoading, isError, error, refetch } = useOrders()

  return (
    <Panel title="Order History" actions={
      <button onClick={() => refetch()} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" disabled={isLoading} aria-label="Refresh orders">
        <span className={`text-lg ${isLoading ? 'animate-spin' : ''}`}>⟳</span>
      </button>
    } className="h-full w-full" bodyClassName="p-0">
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto p-4 pr-2">
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
              <AnimatePresence>
                {orders.map(order => (
                  <motion.div key={order.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.18 }}>
                    <OrderTicket order={order} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </Panel>
  )
}
