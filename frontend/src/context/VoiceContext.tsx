import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { ensureSpeechReady, startListening as svcStartListening, stopListening as svcStopListening, playAudioBlob, stopAudioPlayback as svcStopAudioPlayback, base64ToBlob, resumeAudioContext } from '../services/audioService'
import { requestGreeting } from '../api/chat'

interface VoiceContextValue {
  isVoiceModeEnabled: boolean
  setVoiceModeEnabled: (enabled: boolean) => void
  isListening: boolean
  isPlayingAudio: boolean
  interimTranscript: string
  stopAudioPlayback: () => void
  base64ToBlob: (b64: string) => Blob | null
}

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined)

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [isVoiceModeEnabled, setVoiceModeEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')

  const stopAudioPlayback = useCallback(() => {
    svcStopAudioPlayback()
    setIsPlayingAudio(false)
  }, [])

  const startGreetingFlow = useCallback(async () => {
    try {
      const ok = await ensureSpeechReady()
      if (!ok) {
        setVoiceModeEnabled(false)
        return
      }
      await resumeAudioContext()
      setIsPlayingAudio(true)
      const blob = await requestGreeting()
      await playAudioBlob(blob, () => setIsPlayingAudio(false))
      // Next tick to avoid race with audio teardown
      requestAnimationFrame(() => {
        svcStartListening({
          onInterim: setInterimTranscript,
          onFinal: () => {},
          onListeningChange: setIsListening,
          onError: (m) => {
            console.warn('startListening error:', m)
            setIsListening(false)
          }
        })
      })
    } catch {
      setVoiceModeEnabled(false)
      setIsListening(false)
      setIsPlayingAudio(false)
    }
  }, [])

  const setVoiceModeAndMaybeStart = useCallback(async (enabled: boolean) => {
    setVoiceModeEnabled(enabled)
    if (enabled) {
      await resumeAudioContext()
      startGreetingFlow()
    } else {
      if (isListening) svcStopListening({ onListeningChange: setIsListening })
      stopAudioPlayback()
      setInterimTranscript('')
    }
  }, [isListening, startGreetingFlow, stopAudioPlayback])

  const value = useMemo<VoiceContextValue>(() => ({
    isVoiceModeEnabled,
    setVoiceModeEnabled: setVoiceModeAndMaybeStart,
    isListening,
    isPlayingAudio,
    interimTranscript,
    stopAudioPlayback,
    base64ToBlob,
  }), [isVoiceModeEnabled, setVoiceModeAndMaybeStart, isListening, isPlayingAudio, interimTranscript, stopAudioPlayback])

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}

export function useVoice() {
  const ctx = useContext(VoiceContext)
  if (!ctx) throw new Error('useVoice must be used within VoiceProvider')
  return ctx
}
