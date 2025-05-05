import { writable, get } from 'svelte/store';
import { fetchOrders } from './orders';
import { browser } from '$app/environment';
import { startListening } from '$lib/services/audioService';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

// Stores
export const chatHistory = writable<ChatMessage[]>([]);
export const isSending = writable(false);
export const chatError = writable<string | null>(null);
export const isVoiceModeEnabled = writable(false);
export const isListening = writable(false);
export const isPlayingAudio = writable(false);

// --- Audio Playback Logic (Moved Here) ---
let audioContext: AudioContext | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;

function getAudioContext(): AudioContext | null {
    if (!browser) return null; // Return null if not in browser
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

async function playAudio(audioBlob: Blob): Promise<void> {
    return new Promise(async (resolve, reject) => {
        const context = getAudioContext();
        if (!context) {
             chatError.set("AudioContext not supported or available.");
             return reject(new Error("AudioContext not available"));
        }

        // Stop any currently playing audio
        if (currentAudioSource) {
            try { currentAudioSource.stop(); } catch (e) { console.warn("Error stopping previous audio:", e); }
            currentAudioSource = null;
        }
        isPlayingAudio.set(false); 

        try {
            isPlayingAudio.set(true);
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioBuffer = await context.decodeAudioData(arrayBuffer);
            const source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            source.onended = () => {
                console.log("Audio playback finished.");
                isPlayingAudio.set(false);
                currentAudioSource = null;
                resolve();
            };
            currentAudioSource = source;
            source.start(0);
            console.log("Audio playback started.");
        } catch (e) {
            console.error("Error playing audio:", e);
            chatError.set("Failed to play audio response.");
            isPlayingAudio.set(false);
            currentAudioSource = null;
            reject(e);
        }
    });
}

export function stopAudioPlayback() {
     const context = getAudioContext();
     if (!context || !currentAudioSource) return;
     try {
         currentAudioSource.stop();
         console.log("Audio playback stopped manually.");
     } catch (e) {
         console.warn("Error stopping audio source manually:", e);
         isPlayingAudio.set(false); // Ensure state reset
         currentAudioSource = null;
     }
}

// Helper function to decode base64 and create Blob
function base64ToBlob(base64: string, contentType = 'audio/mpeg'): Blob | null {
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  } catch (e) {
    console.error("Error decoding base64 string:", e);
    return null;
  }
}

// --- Chat Logic ---

// Send a chat message to the backend
export async function sendChat(message: string): Promise<string | undefined> {
  if (!message.trim()) return undefined;
  
  const userMessage: ChatMessage = {
    role: 'user',
    content: message,
    timestamp: new Date()
  };
  
  chatHistory.update(history => [...history, userMessage]);
  isSending.set(true);
  chatError.set(null);
  
  const voiceMode = get(isVoiceModeEnabled);
  
  try {
    // Send request_audio flag in body, remove Accept header
    const requestBody = {
      message,
      request_audio: voiceMode
    };

    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No 'Accept' header needed now
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
       const errorText = await response.text();
       throw new Error(`Error ${response.status}: ${errorText || response.statusText}`);
    }
    
    // Always parse JSON now
    const data = await response.json();
    console.log("Received chat response data:", data);

    let assistantTextReply = '';
    let playedAudio = false;
    
    // Check if response contains base64 audio data
    if (data && typeof data.audio === 'string' && data.audio.length > 0) {
      console.log("Audio data found in response.");
      assistantTextReply = data.reply || '[Missing text reply]';
      
      // Decode base64 audio and play it
      const audioBlob = base64ToBlob(data.audio);
      if (audioBlob) {
        try {
          console.log("Playing decoded audio...");
          await playAudio(audioBlob);
          playedAudio = true;
          console.log("Decoded audio finished playing.");
        } catch (playError) {
           console.error("Error playing decoded audio:", playError);
           chatError.set("Failed to play received audio.");
           // Still display text reply even if audio fails
        }
      } else {
        console.error("Failed to decode base64 audio string from response.");
        chatError.set("Received invalid audio data from server.");
        // Fallback text if decoding fails
        assistantTextReply = data.reply ? `${data.reply} [Audio decode error]` : '[Audio decode error]';
      }
    } else {
      // Handle text-only response
      console.log("No audio data in response, processing as text.");
      assistantTextReply = data.reply || '[Missing or invalid reply]';
    }
    
    // Add assistant message to history
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: assistantTextReply,
      timestamp: new Date()
    };
    chatHistory.update(history => [...history, assistantMessage]);
    
    await fetchOrders();

    // Restart listening if voice mode is still on and audio finished
    if (playedAudio && get(isVoiceModeEnabled) && !get(isListening)) {
      console.log("Audio finished, restarting listening (sendChat)...");
      startListening(); 
    }
    
    return assistantTextReply;

  } catch (err) {
    console.error('Error sending message:', err);
    chatError.set(err instanceof Error ? err.message : 'Failed to send message');
    return undefined;
  } finally {
    isSending.set(false);
  }
}

// Request initial greeting audio
export async function requestGreeting() {
  if (!browser) return;
  const initialVoiceModeState = get(isVoiceModeEnabled);
  if (!initialVoiceModeState) {
    console.log("requestGreeting: Aborting, voice mode was disabled before starting.");
    return;
  }

  console.log("requestGreeting: Starting...");
  const GREETING_TRIGGER = "__INITIAL_GREETING__"; 
  chatError.set(null);
  isSending.set(true); 

  try {
    console.log("requestGreeting: Fetching audio...");
    const response = await fetch('http://localhost:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg' 
      },
      body: JSON.stringify({ message: GREETING_TRIGGER })
    });
    console.log(`requestGreeting: Fetch response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Greeting Error ${response.status}: ${errorText || response.statusText}`);
    }

    if (response.headers.get('Content-Type')?.includes('audio/mpeg')) {
        const audioBlob = await response.blob();
        console.log("requestGreeting: Playing audio...");
        await playAudio(audioBlob); // This is where the mode might change
        console.log("requestGreeting: playAudio finished.");
        
        const voiceModeAfterPlay = get(isVoiceModeEnabled);
        console.log(`requestGreeting: Voice mode state after playAudio: ${voiceModeAfterPlay}`);

        if (voiceModeAfterPlay && !get(isListening)) { 
            console.log("requestGreeting: Restarting listening...");
            startListening(); 
        } else {
            // Log why listening isn't starting
            if (!voiceModeAfterPlay) {
              console.log("requestGreeting: Not restarting listening because voice mode was disabled during playback.");
            } else if (get(isListening)) {
              console.log("requestGreeting: Not restarting listening because it's already active.");
            }
        }
    } else {
        console.warn("requestGreeting: Received non-audio response.");
    }

  } catch (err) {
    console.error('requestGreeting: Error fetching/playing greeting:', err);
    chatError.set(err instanceof Error ? err.message : 'Failed to fetch/play greeting');
    // Check state in catch block
    console.log(`requestGreeting: Voice mode state in catch block: ${get(isVoiceModeEnabled)}`);
    // Optionally disable voice mode on error?
    // isVoiceModeEnabled.set(false);
  } finally {
     isSending.set(false); 
     // Check state in finally block
     console.log(`requestGreeting: Voice mode state in finally block: ${get(isVoiceModeEnabled)}`);
     console.log("requestGreeting: Finished.");
  }
}

// Clear chat history
export function clearChat(): void {
  chatHistory.set([]);
} 