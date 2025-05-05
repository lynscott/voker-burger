<!-- Main Page Component -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Header from '$lib/components/Header.svelte';
  import StatsCounter from '$lib/components/StatsCounter.svelte';
  import DriveThruIntercom from '$lib/components/DriveThruIntercom.svelte';
  import OrderBoard from '$lib/components/OrderBoard.svelte';
  import { totals, fetchOrders } from '$lib/stores/orders';
  
  let prevTotals = $state({ burger: 0, fries: 0, drink: 0 });
  
  $effect(() => {
    const currentTotals = $totals;
    prevTotals = { ...currentTotals };
  });
  
  onMount(() => {
    fetchOrders();
  });
</script>

<svelte:head>
  <title>Voker Burger - AI Drive-Thru</title>
  <meta name="description" content="AI-powered virtual drive-thru experience" />
</svelte:head>

<div class="container mx-auto flex h-screen max-w-6xl flex-col overflow-hidden px-4 py-4">
  <!-- Header -->
  <div class="flex-none">
    <Header />
  </div>
  
  <!-- Stats Dashboard-->
  <section class="mb-4 flex-none flex flex-row gap-4">
    <div class="flex-1">
      <StatsCounter 
        icon="🍔" 
        label="Total Burgers" 
        value={$totals.burger} 
      />
    </div>
    <div class="flex-1">
      <StatsCounter 
        icon="🍟" 
        label="Total Fries" 
        value={$totals.fries} 
      />
    </div>
    <div class="flex-1">
      <StatsCounter 
        icon="🥤" 
        label="Total Drinks" 
        value={$totals.drink} 
      />
    </div>
  </section>
  
  <!-- Main Content-->
  <div class="flex flex-1 flex-col gap-6 overflow-y-auto lg:flex-row">
    <div class="flex min-h-0 lg:h-full lg:w-2/3">
      <DriveThruIntercom />
    </div>
    
    <div class="flex min-h-0 lg:h-full lg:w-1/3">
      <OrderBoard />
    </div>
  </div>
  
  <!-- Footer -->
  <footer class="mt-4 flex-none text-center text-sm text-muted-foreground">
    <p>&copy; {new Date().getFullYear()} Voker Burger Drive-Thru</p>
  </footer>
</div>

<style>
  :global(body) {
    background-color: #111827;
    background-image: radial-gradient(#3f3f3f 0.5px, transparent 0.5px), radial-gradient(#3f3f3f 0.5px, #111827 0.5px);
    background-size: 20px 20px;
    background-position: 0 0, 10px 10px;
    overflow: hidden;
  }
</style>
