let audioContext: AudioContext | null = null
let currentAudioSource: AudioBufferSourceNode | null = null

export async function resumeAudioContext(): Promise<void> {
  if (!audioContext) return
  if (audioContext.state === 'suspended') {
    try { await audioContext.resume() } catch {}
  }
}

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

function buildRecognition(): SpeechRecognition | null {
  try {
    if (!RecognitionCtor) return null
    const rec: SpeechRecognition = new RecognitionCtor()
    rec.continuous = false
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 1
    return rec
  } catch {
    return null
  }
}

export async function startListening(callbacks: SpeechCallbacks) {
  if (!recognition) {
    recognition = buildRecognition()
  }
  if (!recognition) {
    callbacks.onError?.('Mic not ready. Please toggle voice mode or allow microphone.')
    callbacks.onListeningChange?.(false)
    return
  }
  // Resume audio context for Safari/iOS quirks
  try { await resumeAudioContext() } catch {}

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
    const code = ev?.error || 'unknown'
    const fatal = code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture'
    callbacks.onError?.(`Speech error: ${code}`)
    callbacks.onListeningChange?.(false)
    if (fatal) {
      // Force rebuild next time
      recognition = null
    }
  }
  recognition.onend = () => {
    callbacks.onListeningChange?.(false)
  }
  recognition.onnomatch = () => {
    // No clear speech detected
    callbacks.onInterim?.('')
  }
  recognition.onaudiostart = () => {}
  recognition.onspeechstart = () => {}
  recognition.onspeechend = () => {}
  recognition.onaudioend = () => {}

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
