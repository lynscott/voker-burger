<!-- DriveThruIntercom.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { sendChat, chatHistory, isSending, chatError, isVoiceModeEnabled, isListening, isPlayingAudio, requestGreeting } from '$lib/stores/chat';
  import { stopAudioPlayback } from '$lib/stores/chat';
  import { startListening, stopListening, interimTranscript, ensureSpeechReady } from '$lib/services/audioService';
  import { Mic, MicOff, Volume2, VolumeX } from 'lucide-svelte';
  
  let message = $state('');
  let inputElement: HTMLInputElement;
  let waveformContainer: HTMLDivElement;
  let waveform: SVGElement | null = null;
  let chatContainer: HTMLDivElement;
  let chatHistoryLength = 0;
  
  // Handle voice mode toggle
  $effect(() => {
    const enabled = $isVoiceModeEnabled;
    console.log('Voice mode effect triggered. Enabled:', enabled);
    
    // Async IIFE to handle async operations within the effect
    (async () => {
      if (enabled) {
        console.log("Voice mode enabled. Ensuring speech is ready...");
        const ready = await ensureSpeechReady(); 
        
        if (ready) {
          console.log("Speech ready. Starting initial listening...");
          startListening();
          console.log("Requesting greeting...");
          requestGreeting(); 
        } else {
          console.log("Speech not ready. Disabling voice mode.");
          if ($isVoiceModeEnabled) { 
            $isVoiceModeEnabled = false; 
          }
        }
      } else {
        console.log("Voice mode disabled. Stopping listening and playback.");
        if ($isListening) {
            stopListening(true);
        }
        stopAudioPlayback(); 
      }
    })();

  });
  
  const handleSubmit = async (event?: Event) => {
    if (event) event.preventDefault();
    if (!message.trim() || $isSending || $isListening || $isPlayingAudio) return;
    await sendChat(message);
    message = '';
    setTimeout(() => {
      if (inputElement) inputElement.focus();
    }, 100);
  };
  
  // Create waveform animation SVG
  const createWaveform = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 20');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.classList.add('waveform');
    
    // Create 5 bars for the waveform
    for (let i = 0; i < 5; i++) {
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bar.setAttribute('x', (i * 20 + 10).toString());
      bar.setAttribute('y', '9'); 
      bar.setAttribute('width', '3');
      bar.setAttribute('height', '1');
      bar.setAttribute('fill', 'currentColor');
      bar.classList.add('waveform-bar');
      svg.appendChild(bar);
    }
    
    return svg;
  };
  
  // Update waveform animation state
  const updateWaveformState = () => {
    if (waveform) {
      if ($isSending || $isPlayingAudio) {
        waveform.classList.add('animate');
      } else {
        waveform.classList.remove('animate');
      }
    }
  };
  
  // Scroll chat to bottom
  const scrollChatToBottom = () => {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  };
  
  onMount(() => {
    // Create waveform SVG
    waveform = createWaveform();
    if (waveformContainer) {
      waveformContainer.appendChild(waveform);
    }
    
    if (inputElement) {
      inputElement.focus();
    }
    
    scrollChatToBottom();
    
    return () => {
      if (waveform && waveformContainer && waveformContainer.contains(waveform)) {
        waveformContainer.removeChild(waveform);
      }
      stopAudioPlayback();
    };
  });
  
  // Effects for UI updates and scrolling
  $effect(() => {
    updateWaveformState();
    
    // Only scroll if chat history changed
    if ($chatHistory && $chatHistory.length !== chatHistoryLength) {
      chatHistoryLength = $chatHistory.length;
      setTimeout(scrollChatToBottom, 0);
    }
  });
  
  // Update input field with interim transcript when listening
  $effect(() => {
    if ($isListening && $interimTranscript) {
      message = $interimTranscript;
    } else if (!$isListening && message === $interimTranscript) {
      message = ''; 
    }
  });
</script>

<div class="drive-thru-intercom relative flex w-full flex-col rounded-xl border bg-gradient-to-b from-slate-800 to-slate-900 shadow-lg lg:h-full">
  <!-- Speaker grille design -->
  <div class="absolute inset-x-0 top-0 flex justify-center">
    <div class="h-4 w-24 rounded-b-lg bg-slate-700"></div>
  </div>
  
  <div class="flex h-full flex-col p-6">
    <!-- Header Area: Speaker label -->
    <div class="flex-none flex items-center justify-center pb-2">
      <div class="rounded bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
        Order Speaker
      </div>
    </div>
    
    <!-- Waveform visualization -->
    <div class="flex-none mx-auto h-8 w-32 text-amber-500 pb-2 flex items-center justify-center" bind:this={waveformContainer}>
      <!-- SVG waveform is added here via JS -->
      {#if $isPlayingAudio}
        <Volume2 class="h-5 w-5 animate-pulse text-amber-400 ml-2" />
      {/if}
    </div>
    
    <!-- Chat messages display area - Flex grow to take available space -->
    <div class="flex-1 min-h-0 overflow-hidden rounded-lg bg-black/30">
      <div class="h-full overflow-y-auto p-3 text-white" bind:this={chatContainer}>
        {#if $chatHistory.length === 0}
          <div class="text-center text-gray-400">
            <!-- <p>Welcome to Voker Burger!</p> -->
            <p class="mt-2 text-sm italic">Try asking "I'd like to order a burger" or "How many orders are active?"</p>
          </div>
        {:else}
          {#each $chatHistory as message (message.timestamp?.getTime() || Math.random())}
            <div class="mb-2 {message.role === 'user' ? 'text-right' : ''}">
              <div class="inline-block max-w-[85%] rounded px-3 py-2 
                         {message.role === 'user' 
                           ? 'bg-blue-600 text-white' 
                           : 'bg-gray-700 text-white'}">
                {message.content}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
    
    <!-- Error message -->
    {#if $chatError}
      <div class="flex-none text-center text-red-500 text-sm py-2">
        {$chatError}
      </div>
    {/if}
    
    <!-- Input area -->
    <div class="flex-none mt-4 space-y-2">
      <label class="flex items-center justify-left cursor-pointer group">
        <input 
          type="checkbox" 
          bind:checked={$isVoiceModeEnabled} 
          class="absolute opacity-0 w-0 h-0 peer" 
          id="voice-toggle-checkbox"
        />
        <span 
          class="w-10 h-10 rounded-md border border-amber-700 bg-amber-900/50 flex items-center justify-center text-amber-400 
                 transition-colors duration-200 ease-in-out 
                 peer-checked:bg-amber-600 peer-checked:text-white peer-checked:border-amber-400
                 group-hover:border-amber-500"
          aria-hidden="true"
        >
          {#if $isVoiceModeEnabled}
            <Volume2 size={18} />
          {:else}
            <VolumeX size={18} />
          {/if}
        </span>
        <span class="text-xs ml-2 text-slate-300">{$isVoiceModeEnabled ? 'Exit voice mode' : 'Speak to attendant'}</span>
      </label>

      <form onsubmit={handleSubmit} class="relative flex items-center">
        <input
          type="text"
          bind:value={message}
          bind:this={inputElement}
          placeholder={$isVoiceModeEnabled ? ($isListening ? 'Listening...' : 'Press mic or type...') : 'Type your order here...'}
          disabled={$isSending || $isPlayingAudio || ($isVoiceModeEnabled && $isListening)} 
          class="w-full rounded-l-lg border border-slate-600 bg-slate-700/80 px-4 py-3 pr-24 text-white placeholder-slate-400 
                 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 
                 disabled:opacity-70 disabled:cursor-not-allowed"
        />
        
        <!-- Microphone Button (Visible in Voice Mode) -->
        {#if $isVoiceModeEnabled}
          <button
            type="button" 
            onclick={() => $isListening ? stopListening() : startListening()}
            disabled={$isSending || $isPlayingAudio} 
            class="absolute right-12 flex h-10 w-10 items-center justify-center rounded-full 
                   {$isListening ? 'bg-red-600 hover:bg-red-500 ring-2 ring-red-400 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'} 
                   text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mr-1"
            aria-label={$isListening ? 'Stop Listening' : 'Start Listening'}
          >
            {#if $isListening}
              <MicOff size={18} />
            {:else}
              <Mic size={18} />
            {/if}
          </button>
        {/if}

        <!-- Send Button -->
        <button
          type="submit"
          disabled={$isSending || $isListening || $isPlayingAudio || !message.trim()} 
          class="absolute right-1 flex h-10 w-10 items-center justify-center rounded-r-lg bg-amber-500 text-black
                 transition-all hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Send message">
          {#if $isSending}
            <span class="animate-spin text-lg">⟳</span>
          {:else}
            <span class="font-bold">→</span>
          {/if}
        </button>
      </form>
    </div>
  </div>
</div>

<style>
  /* Waveform animation */
  :global(.waveform-bar) {
    transform-origin: center;
    transition: height 0.2s ease;
  }
  
  /* Drive-thru speaker aesthetics */
  .drive-thru-intercom {
    position: relative;
    overflow: hidden;
  }
  
  .drive-thru-intercom::before {
    content: '';
    position: absolute;
    top: 20px;
    left: 10px;
    right: 10px;
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
  
  /* Animation for waveform bars */
  @keyframes waveform {
    0%, 100% { height: 2px; y: 9px; }
    50% { height: 10px; y: 5px; }
  }
  
  :global(.waveform-bar:nth-child(1)) { animation: waveform 0.9s ease-in-out infinite; animation-delay: 0s; }
  :global(.waveform-bar:nth-child(2)) { animation: waveform 0.9s ease-in-out infinite; animation-delay: 0.2s; }
  :global(.waveform-bar:nth-child(3)) { animation: waveform 0.9s ease-in-out infinite; animation-delay: 0.3s; }
  :global(.waveform-bar:nth-child(4)) { animation: waveform 0.9s ease-in-out infinite; animation-delay: 0.1s; }
  :global(.waveform-bar:nth-child(5)) { animation: waveform 0.9s ease-in-out infinite; animation-delay: 0.4s; }
  
  :global(.waveform-bar) {
    animation-play-state: paused;
  }
  
  :global(.waveform.animate .waveform-bar) {
    animation-play-state: running;
  }
</style> 