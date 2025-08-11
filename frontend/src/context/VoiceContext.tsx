import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { ensureSpeechReady, startListening as svcStartListening, stopListening as svcStopListening, playAudioBlob, stopAudioPlayback as svcStopAudioPlayback, base64ToBlob, resumeAudioContext } from '../services/audioService'
import { requestGreeting } from '../api/chat'

interface VoiceContextValue {
  isVoiceModeEnabled: boolean
  setVoiceModeEnabled: (enabled: boolean) => void
  isListening: boolean
  isPlayingAudio: boolean
  interimTranscript: string
  finalTranscript: string
  consumeFinalTranscript: () => string
  startListeningIfEnabled: () => void
  setPlaybackActive: (active: boolean) => void
  stopAudioPlayback: () => void
  base64ToBlob: (b64: string) => Blob | null
}

const VoiceContext = createContext<VoiceContextValue | undefined>(undefined)

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const [isVoiceModeEnabled, setVoiceModeEnabled] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')

  const consumeFinalTranscript = useCallback(() => {
    const text = finalTranscript
    if (text) setFinalTranscript('')
    return text
  }, [finalTranscript])

  const stopAudioPlayback = useCallback(() => {
    svcStopAudioPlayback()
    setIsPlayingAudio(false)
  }, [])

  const startListeningIfEnabled = useCallback(() => {
    if (!isVoiceModeEnabled || isPlayingAudio) return
    svcStartListening({
      onInterim: setInterimTranscript,
      onFinal: (text) => {
        setInterimTranscript('')
        setFinalTranscript(text)
      },
      onListeningChange: setIsListening,
      onError: (m) => {
        console.warn('startListening error:', m)
        setIsListening(false)
      }
    })
  }, [isVoiceModeEnabled, isPlayingAudio])

  const setPlaybackActive = useCallback((active: boolean) => {
    setIsPlayingAudio(active)
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
      // Start listening directly after a tick to avoid stale isPlayingAudio closure
      setTimeout(() => {
        svcStartListening({
          onInterim: setInterimTranscript,
          onFinal: (text) => {
            setInterimTranscript('')
            setFinalTranscript(text)
          },
          onListeningChange: setIsListening,
          onError: (m) => {
            console.warn('startListening error:', m)
            setIsListening(false)
          }
        })
      }, 0)
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
      setFinalTranscript('')
    }
  }, [isListening, startGreetingFlow, stopAudioPlayback])

  const value = useMemo<VoiceContextValue>(() => ({
    isVoiceModeEnabled,
    setVoiceModeEnabled: setVoiceModeAndMaybeStart,
    isListening,
    isPlayingAudio,
    interimTranscript,
    finalTranscript,
    consumeFinalTranscript,
    startListeningIfEnabled,
    setPlaybackActive,
    stopAudioPlayback,
    base64ToBlob,
  }), [isVoiceModeEnabled, setVoiceModeAndMaybeStart, isListening, isPlayingAudio, interimTranscript, finalTranscript, consumeFinalTranscript, startListeningIfEnabled, setPlaybackActive, stopAudioPlayback])

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}

export function useVoice() {
  const ctx = useContext(VoiceContext)
  if (!ctx) throw new Error('useVoice must be used within VoiceProvider')
  return ctx
}
