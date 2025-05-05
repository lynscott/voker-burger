import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { chatError, isListening, isVoiceModeEnabled } from '$lib/stores/chat'; 
import { sendChat } from '$lib/stores/chat';

// Basic Manual Type Definitions for Web Speech API (as fallback)
interface SpeechRecognitionEventMap {
    "audiostart": Event;
    "soundstart": Event;
    "speechstart": Event;
    "speechend": Event;
    "soundend": Event;
    "audioend": Event;
    "result": SpeechRecognitionEvent;
    "nomatch": SpeechRecognitionEvent;
    "error": SpeechRecognitionErrorEvent;
    "start": Event;
    "end": Event;
}

interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
}

interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
}

interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null; // Use defined type
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    abort(): void;
    start(): void;
    stop(): void;
    addEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
}

declare var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
};

// Extend Window interface for vendor-prefixed SpeechRecognition
declare global {
    interface Window {
        SpeechRecognition: typeof SpeechRecognition;
        webkitSpeechRecognition: typeof SpeechRecognition;
    }
}

// Make SpeechRecognition compatible with older browsers
let BrowserSpeechRecognition: typeof SpeechRecognition | undefined = undefined;
// Holds the *currently active* recognition instance
let currentRecognition: SpeechRecognition | null = null; 

// Initialize API access only in the browser
if (browser) {
    BrowserSpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
}

// Store for live transcript preview
export const interimTranscript = writable('');

// --- Permission Handling ---
let permissionChecked = false;
let permissionGranted = false;

export async function requestMicPermission(): Promise<boolean> {
    if (!browser || !BrowserSpeechRecognition) {
        console.error("Speech recognition not supported or not in browser.");
        if (browser) chatError.set("Speech recognition not supported in this browser.");
        return false;
    }
    if (permissionChecked) return permissionGranted;

    // 1. Try Permissions API first
    if (navigator.permissions) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as any });
            console.log("Microphone permission status:", permissionStatus.state);

            if (permissionStatus.state === 'granted') {
                permissionGranted = true;
                permissionChecked = true;
                return true;
            }
            if (permissionStatus.state === 'denied') {
                chatError.set("Microphone permission denied. Please enable it in browser settings.");
                permissionGranted = false;
                permissionChecked = true;
                return false;
            }
            // If state is 'prompt', fall through to trigger the actual prompt.
        } catch (e) {
            console.warn("Permissions API query failed (might be unsupported):", e);
            // Fall through to the recognition start method as fallback.
        }
    }

    // 2. Fallback/Prompt Trigger: Use a temporary instance to trigger the prompt.
    console.log("Permissions API prompt or fallback: attempting brief recognition start...");
    
    let tempRecognition: SpeechRecognition | null = null;
    try {
        tempRecognition = new BrowserSpeechRecognition();
    } catch (err) {
        console.error("Failed to create temporary SpeechRecognition instance for permission check:", err);
        chatError.set("Failed to initialize mic check.");
        permissionChecked = true;
        permissionGranted = false;
        return false; 
    }
    
    if (get(isListening) && currentRecognition) {
        console.warn("requestMicPermission: Recognition already active, assuming permission OK for now.");
        return true;
    }

    return new Promise((resolve) => {
        let resolved = false;
        const tempInstance = tempRecognition!;

        const resolveOnce = (value: boolean) => {
            if (!resolved) {
                resolved = true;
                permissionGranted = value;
                permissionChecked = true;
                try { tempInstance.stop(); } catch(e) {} 
                tempInstance.removeEventListener('error', onError);
                tempInstance.removeEventListener('audiostart', onReady);
                console.log(`Permission check resolved: ${value}`);
                resolve(value);
            }
        };

        const onError = (event: Event) => {
            const errorEvent = event as SpeechRecognitionErrorEvent;
            console.error("Permission error during check/prompt:", errorEvent.error);
            if (errorEvent.error === 'not-allowed' || errorEvent.error === 'service-not-allowed') {
                chatError.set("Microphone permission denied.");
                resolveOnce(false);
            } else {
                // Don't set a persistent error for transient check issues
                console.warn(`Mic check failed with error: ${errorEvent.error}`);
                permissionChecked = false; 
                permissionGranted = false;
                resolveOnce(false);
            }
        };

        const onReady = () => {
            console.log("Mic permission OK (via audiostart during check).");
            resolveOnce(true);
        };
        
        tempInstance.addEventListener('error', onError, { once: true });
        tempInstance.addEventListener('audiostart', onReady, { once: true }); 

        try {
            console.log("Starting temporary recognition to trigger prompt/check...");
            tempInstance.start();
            
            setTimeout(() => {
                 if (!resolved) {
                    console.warn("Permission check timeout - assuming denied or issue.");
                    resolveOnce(false);
                 }
            }, 5000);

        } catch (e: any) {
            console.error("Error starting temporary recognition for permission check:", e);
            chatError.set("Failed to start mic check process.");
            resolveOnce(false);
        }
    });
}

// --- Web Speech API Instance Management ---

function initializeRecognition(): SpeechRecognition | null {
    if (!browser || !BrowserSpeechRecognition) {
        console.error("Cannot initialize: Not in browser or API not supported.");
        return null;
    }

    console.log("Initializing new SpeechRecognition instance...");
    let newRecognition: SpeechRecognition;
    try {
        newRecognition = new BrowserSpeechRecognition();
    } catch (err) {
        console.error("Failed to create SpeechRecognition instance:", err);
        chatError.set("Failed to initialize speech recognition.");
        isVoiceModeEnabled.set(false); 
        return null;
    }

    newRecognition.continuous = false;
    newRecognition.lang = 'en-US';
    newRecognition.interimResults = true;
    newRecognition.maxAlternatives = 1;

    // --- Attach Event Handlers ---

    newRecognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                currentInterim += event.results[i][0].transcript;
            }
        }

        interimTranscript.set(currentInterim);

        if (finalTranscript) {
            const lowerTranscript = finalTranscript.trim().toLowerCase();
            console.log("Final transcript:", lowerTranscript);
            interimTranscript.set('');
            
            if (lowerTranscript === 'bye' || lowerTranscript === 'goodbye') {
                console.log("Bye detected, stopping voice mode.");
                stopListening();
                isVoiceModeEnabled.set(false);
            } else {
                sendChat(finalTranscript.trim()); 
            }
        }
    };

    newRecognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error, event.message, event);
        let errorMsg = `Speech error: ${event.error}`;
        if (event.error === 'network') {
            errorMsg = "Network error during speech recognition. Please check connection.";
        } else if (event.error === 'no-speech') {
            errorMsg = "No speech detected. Please try speaking again.";
        } else if (event.error === 'audio-capture') {
            errorMsg = "Microphone error. Please ensure it's connected and enabled.";
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
             errorMsg = "Speech recognition blocked. Please allow microphone access.";
             permissionDenied();
        }
        
        chatError.set(errorMsg + (event.message ? ` (${event.message})` : ''));
        
        console.log("onerror: Cleaning up state.");
        isListening.set(false);
        interimTranscript.set('');
        currentRecognition = null; 
    };

    newRecognition.onend = () => {
        console.log('Speech recognition session ended.');
        if (get(isListening)) {
             console.log("onend: Resetting isListening state.");
             isListening.set(false);
        }
        interimTranscript.set(''); 
        console.log("onend: Instance remains available for next listen.");
    };

    newRecognition.onaudiostart = () => {
        console.log('Audio capturing started.');
        chatError.set(null);
    };

    newRecognition.onspeechstart = () => {
        console.log('Speech has been detected.');
    };

    newRecognition.onspeechend = () => {
        console.log('Speech has stopped being detected.');
    };
    
    const permissionDenied = () => {
        permissionGranted = false;
        permissionChecked = true;
        isVoiceModeEnabled.set(false);
        stopListening();
    };

    return newRecognition;
}

// Ensures permission is granted and a recognition instance is ready.
// Stores the ready instance in currentRecognition.
// Returns true on success, false on failure.
export async function ensureSpeechReady(): Promise<boolean> { 
     console.log("ensureSpeechReady: Starting check...");
     if (!browser) return false;

     const hasPermission = await requestMicPermission();
     if (!hasPermission) {
         console.error("ensureSpeechReady: Permission denied or unavailable.");
         return false; 
     }
     console.log("ensureSpeechReady: Permission granted.");

     // Permission granted, get a fresh instance
     const recognitionInstance = initializeRecognition();
     if (!recognitionInstance) {
         console.error("ensureSpeechReady: Failed to initialize recognition instance.");
         currentRecognition = null; 
         return false; 
     }
     
     console.log("ensureSpeechReady: Initialization successful. Instance stored.");
     currentRecognition = recognitionInstance; 
     return true; 
}


// --- Control Functions ---

export async function startListening() {
    console.log("startListening: Attempting...");
    if (!browser) return;
    if (get(isListening)) {
        console.warn("startListening: Already listening, aborting start.");
        return;
    }
    if (!currentRecognition) {
        console.error("startListening: Called but currentRecognition is null!");
        chatError.set("Mic not ready. Please toggle voice mode.");
        isListening.set(false);
        return;
    }

    try {
        isListening.set(true);
        interimTranscript.set('');
        console.log("startListening: Calling currentRecognition.start()...");
        currentRecognition.start();
        console.log('startListening: Speech recognition started successfully.');
    } catch (e: any) {
        console.error("startListening: Error calling recognition.start():", e);
        isListening.set(false);
        chatError.set(`Could not start microphone: ${e.message || e.name}`);
        currentRecognition = null;
    }
}

export function stopListening(calledFromToggle: boolean = false) {
    console.log(`stopListening: Attempting manual stop... (Called from toggle: ${calledFromToggle})`);
    if (!browser) return;

    const recognition = currentRecognition; 
    const listeningState = get(isListening);

    if (recognition && listeningState) {
        console.log('stopListening: Stopping active recognition...');
        if (calledFromToggle) {
            chatError.set(null);
        }
        try {
            recognition.onresult = null;
            recognition.onerror = null;
            recognition.onend = null;
            
            recognition.stop();
            console.log("stopListening: recognition.stop() called.");
            
            isListening.set(false); 
            currentRecognition = null; 
            console.log("stopListening: Instance stopped, nullified, and state updated.");

        } catch (e) {
             console.error("stopListening: Error calling recognition.stop():", e);
             isListening.set(false);
             currentRecognition = null;
             if (!calledFromToggle) {
                chatError.set("Error stopping microphone.");
             }
        }
        interimTranscript.set('');
    } else {
        console.warn(`stopListening: Not stopping (Recognition found: ${!!recognition}, Listening state: ${listeningState})`);
        if (listeningState) isListening.set(false);
    }
    console.log(`stopListening: Finished. Listening state: ${get(isListening)}`);
}