import { getJson } from './client'
import type { OrderResponse } from '../types/orders'

export function getOrders(): Promise<OrderResponse> {
  return getJson<OrderResponse>('/orders')
}
