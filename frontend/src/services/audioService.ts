let audioContext: AudioContext | null = null
let currentAudioSource: AudioBufferSourceNode | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

export async function playAudioBlob(audioBlob: Blob, onEnded?: () => void): Promise<void> {
  const context = getAudioContext()
  if (currentAudioSource) {
    try { currentAudioSource.stop() } catch {}
    currentAudioSource = null
  }
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioBuffer = await context.decodeAudioData(arrayBuffer)
  const source = context.createBufferSource()
  source.buffer = audioBuffer
  source.connect(context.destination)
  source.onended = () => {
    currentAudioSource = null
    onEnded?.()
  }
  currentAudioSource = source
  source.start(0)
}

export function stopAudioPlayback(): void {
  if (currentAudioSource) {
    try { currentAudioSource.stop() } catch {}
    currentAudioSource = null
  }
}

export function base64ToBlob(base64: string, contentType = 'audio/mpeg'): Blob | null {
  try {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i)
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: contentType })
  } catch {
    return null
  }
}

// --- Web Speech API ---
let RecognitionCtor: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
let recognition: SpeechRecognition | null = null

export interface SpeechCallbacks {
  onInterim?: (text: string) => void
  onFinal?: (text: string) => void
  onListeningChange?: (listening: boolean) => void
  onError?: (message: string) => void
}

export async function ensureSpeechReady(): Promise<boolean> {
  try {
    if (!RecognitionCtor) return false
    recognition = new RecognitionCtor()
    recognition.continuous = false
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    return true
  } catch {
    recognition = null
    return false
  }
}

export function startListening(callbacks: SpeechCallbacks) {
  if (!recognition) {
    callbacks.onError?.('Mic not ready. Please toggle voice mode.')
    callbacks.onListeningChange?.(false)
    return
  }
  callbacks.onListeningChange?.(true)
  callbacks.onInterim?.('')

  recognition.onresult = (event: any) => {
    let finalTranscript = ''
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript
      else interim += event.results[i][0].transcript
    }
    callbacks.onInterim?.(interim)
    if (finalTranscript.trim()) callbacks.onFinal?.(finalTranscript.trim())
  }
  recognition.onerror = (ev: any) => {
    let msg = `Speech error: ${ev.error}`
    callbacks.onError?.(msg)
    callbacks.onListeningChange?.(false)
    recognition = null
  }
  recognition.onend = () => {
    callbacks.onListeningChange?.(false)
  }
  try {
    recognition.start()
  } catch (e: any) {
    callbacks.onError?.(`Could not start microphone: ${e?.message || e?.name}`)
    callbacks.onListeningChange?.(false)
    recognition = null
  }
}

export function stopListening(callbacks?: SpeechCallbacks) {
  try { recognition?.stop() } catch {}
  recognition = null
  callbacks?.onListeningChange?.(false)
}
