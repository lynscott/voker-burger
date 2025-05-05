<!-- StatsCounter.svelte -->
<script lang="ts">
  // Props
  export let icon: string;
  export let label: string;
  export let value: number = 0;
</script>

<div class="stats-counter relative overflow-hidden rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all duration-300">
  <div class="flex flex-col items-center space-y-2">
    <!-- Icon -->
    <div class="text-3xl" aria-hidden="true">
      {icon}
    </div>
    
    <!-- Counter value -->
    <div class="counter-value relative h-12 w-full overflow-hidden text-center">
      <span class="text-4xl font-bold tabular-nums">
        {value}
      </span>
    </div>
    
    <!-- Label -->
    <div class="text-sm font-medium text-muted-foreground">
      {label}
    </div>
  </div>
</div>

<style>
  .counter-value {
    transition: color 0.3s ease;
  }
</style> 