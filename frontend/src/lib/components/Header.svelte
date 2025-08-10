<!-- Header.svelte -->
<script>
  // No props or internal state needed for this simple component
</script>

<header class="relative mb-6 pb-4">
  <div class="relative flex flex-col items-center justify-center overflow-hidden py-6 text-center">
    <!-- Neon glow effect -->
    <div class="absolute inset-0 z-0 overflow-hidden opacity-30">
      <div class="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-red-500 blur-3xl"></div>
      <div class="absolute left-1/3 top-1/2 h-24 w-32 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-amber-400 blur-3xl"></div>
    </div>
    
    <!-- Main title -->
    <h1 class="neon-text relative z-10 text-4xl font-extrabold tracking-tighter text-white md:text-5xl lg:text-6xl">
      <span class="text-shadow block bg-gradient-to-b from-orange-300 to-amber-600 bg-clip-text text-transparent">
        Bada Bing Burgers
      </span>
    </h1>
    
    <!-- Subtitle -->
    <p class="relative z-10 mt-2 text-sm text-gray-300 md:text-base">
      Home of the deathly delicious White Lotus burger
    </p>
  </div>
</header>

<style>
  /* Neon text effect */
  .neon-text {
    animation: pulsate 1.5s infinite alternate;
  }
  
  .text-shadow {
    text-shadow: 
      0 0 7px rgba(255, 136, 0, 0.8),
      0 0 10px rgba(255, 136, 0, 0.8),
      0 0 21px rgba(255, 136, 0, 0.8),
      0 0 42px rgba(255, 60, 0, 0.6);
  }
  
  @keyframes pulsate {
    100% {
      text-shadow: 
        0 0 4px rgba(255, 136, 0, 0.8),
        0 0 8px rgba(255, 136, 0, 0.8),
        0 0 18px rgba(255, 136, 0, 0.8),
        0 0 38px rgba(255, 60, 0, 0.6);
    }
    0% {
      text-shadow: 
        0 0 2px rgba(255, 136, 0, 0.8),
        0 0 6px rgba(255, 136, 0, 0.8),
        0 0 15px rgba(255, 136, 0, 0.8),
        0 0 30px rgba(255, 60, 0, 0.6);
    }
  }
</style> 