<!-- OrderTicket.svelte -->
<script lang="ts">
  import { fly, scale } from 'svelte/transition';
  import { elasticOut } from 'svelte/easing';
  import type { Order } from '../stores/orders';
  
  export let order: Order;
  
  // Format the order details into a readable string
  $: formattedItems = order.details?.map(item => 
    `${item.qty}x ${item.item}`
  ).join(', ') || 'No items';
  
  // Is this order active?
  $: isActive = order.status === 'PLACED';
  
  // Format the timestamp
  // Append 'Z' to the timestamp string to ensure JS interprets it as UTC
  $: utcDate = order.created_at ? new Date(order.created_at + 'Z') : null;
  $: formattedDate = utcDate 
    ? utcDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Invalid date';
</script>

<div class="order-ticket relative mb-3 overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200 {isActive ? '' : 'opacity-70'}"
     in:fly={{ y: 20, duration: 400, delay: 200 }}>
  
  <!-- Order status indicator -->
  <div class="absolute right-1 top-1">
    <div class="h-2 w-2 rounded-full {isActive ? 'bg-green-500' : 'bg-gray-500'} shadow"
         in:scale={{ duration: 400, easing: elasticOut }}></div>
  </div>
  
  <!-- Cancelled overlay, if needed -->
  {#if !isActive}
    <div class="absolute inset-0 flex items-center justify-center bg-black/20"
         in:fly={{ duration: 200 }}>
      <div class="rotate-12 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs font-bold uppercase text-gray-300">
        Cancelled
      </div>
    </div>
  {/if}
  
  <div class="p-3">
    <div class="flex justify-between">
      <!-- Order ID -->
      <div class="font-bold">
        Order #{order.id}
      </div>
      
      <!-- Timestamp -->
      <div class="text-sm text-muted-foreground">
        {formattedDate}
      </div>
    </div>
    
    <!-- Order details -->
    <div class="mt-2 text-sm">
      <span class="font-medium">Items:</span> {formattedItems}
    </div>
    
    <!-- Order total -->
    <div class="mt-1 text-sm">
      <span class="font-medium">Total items:</span> {order.total_items}
    </div>
  </div>
</div> 