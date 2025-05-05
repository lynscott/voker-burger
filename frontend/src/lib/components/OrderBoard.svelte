<!-- OrderBoard.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import OrderTicket from './OrderTicket.svelte';
  import { orders, isLoading, error, fetchOrders } from '../stores/orders';
  
  onMount(() => {
    fetchOrders();
    
    const interval = setInterval(fetchOrders, 10000);
    
    return () => {
      clearInterval(interval);
    };
  });
</script>

<div class="order-board flex h-full w-full flex-col rounded-lg border bg-card shadow-sm">
  <!-- Header -->
  <div class="flex-none border-b p-4 flex items-center justify-between">
    <h2 class="text-lg font-semibold">Order History</h2>
    
    <!-- Refresh button -->
    <button 
      on:click={() => fetchOrders()}
      class="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      disabled={$isLoading}
      aria-label="Refresh orders"
    >
      <span class="text-lg {$isLoading ? 'animate-spin' : ''}">⟳</span>
    </button>
  </div>
  
  <!-- Content area - flex-grow to fill available space with scrolling -->
  <div class="flex-1 overflow-hidden p-4">
    <!-- Loading state -->
    {#if $isLoading && $orders.length === 0}
      <div class="flex h-full items-center justify-center">
        <div class="text-center text-muted-foreground">
          <div class="mb-2 text-2xl animate-spin">⟳</div>
          <p>Loading orders...</p>
        </div>
      </div>
    <!-- Error state -->
    {:else if $error}
      <div class="flex h-full items-center justify-center">
        <div class="text-center text-red-500">
          <p class="mb-2">Failed to load orders</p>
          <p class="text-sm">{$error}</p>
          <button 
            on:click={() => fetchOrders()}
            class="mt-4 rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    <!-- Empty state -->
    {:else if $orders.length === 0}
      <div class="flex h-full items-center justify-center">
        <div class="text-center text-muted-foreground">
          <p>No orders yet</p>
          <p class="mt-1 text-sm">Use the intercom to place an order</p>
        </div>
      </div>
    <!-- Order list -->
    {:else}
      <div class="h-full overflow-y-auto pr-1">
        {#each $orders as order (order.id)}
          <OrderTicket {order} />
        {/each}
      </div>
    {/if}
  </div>
</div> 