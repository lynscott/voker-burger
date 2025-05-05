import { writable, derived } from 'svelte/store';

export interface OrderDetail {
  item: string;
  qty: number;
}

export interface Order {
  id: number;
  status: 'PLACED' | 'CANCELLED';
  total_items: number;
  details: OrderDetail[];
  created_at: string;
}

export interface OrderResponse {
  orders: Order[];
  totals: Record<string, number>;
}

// Menu items type to ensure type safety
export type MenuItem = 'burger' | 'fries' | 'drink';

// Stores
export const orders = writable<Order[]>([]);
export const isLoading = writable(false);
export const error = writable<string | null>(null);

// Derived store for menu item totals
export const totals = derived(orders, ($orders) => {
  const initial: Record<MenuItem, number> = { burger: 0, fries: 0, drink: 0 };
  
  return $orders.reduce((acc, order) => {
    if (order.status === 'PLACED' && order.details) {
      order.details.forEach(item => {
        const itemName = item.item as MenuItem;
        if (itemName in acc) {
          acc[itemName] += item.qty;
        }
      });
    }
    return acc;
  }, initial);
});

// Actions to fetch and update orders
export async function fetchOrders(): Promise<OrderResponse | undefined> {
  isLoading.set(true);
  error.set(null);
  
  try {
    const response = await fetch('http://localhost:8000/orders');
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const data: OrderResponse = await response.json();
    orders.set(data.orders);
    return data;
  } catch (err) {
    console.error('Error fetching orders:', err);
    error.set(err instanceof Error ? err.message : 'Failed to fetch orders');
    return undefined;
  } finally {
    isLoading.set(false);
  }
} 