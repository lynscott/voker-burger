import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOrders } from '../api/orders'
import type { MenuItem, Order, Totals } from '../types/orders'

export function useOrders() {
  const query = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  })

  const orders: Order[] = query.data?.orders ?? []

  const totals = useMemo<Totals>(() => {
    const initial: Totals = { burger: 0, fries: 0, drink: 0 }
    return orders.reduce((acc, order) => {
      if (order.status === 'PLACED' && Array.isArray(order.details)) {
        for (const detail of order.details) {
          const item = detail.item as MenuItem
          if (item in acc) acc[item] += detail.qty
        }
      }
      return acc
    }, initial)
  }, [orders])

  return { ...query, orders, totals }
}
