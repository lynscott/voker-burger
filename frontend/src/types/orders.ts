export type MenuItem = 'burger' | 'fries' | 'drink'

export interface OrderDetail {
  item: MenuItem | string
  qty: number
}

export interface Order {
  id: number
  status: 'PLACED' | 'CANCELLED'
  total_items: number
  details: OrderDetail[]
  created_at: string
}

export interface OrderResponse {
  orders: Order[]
  totals: Record<string, number>
}

export type Totals = Record<MenuItem, number>
