import React, { useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { useVoice } from '../context/VoiceContext'
import { sendChat } from '../api/chat'
import { base64ToBlob, playAudioBlob, resumeAudioContext } from '../services/audioService'
import Panel from './Panel'
import { AnimatePresence } from 'framer-motion'
import ChatBubble from './ChatBubble'
import TypingIndicator from './TypingIndicator'
import { useToast } from '../context/ToastContext'

interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp?: Date }

export default function DriveThruIntercom() {
  const { isVoiceModeEnabled, setVoiceModeEnabled, isListening, isPlayingAudio, interimTranscript, finalTranscript, consumeFinalTranscript, startListeningIfEnabled, setPlaybackActive } = useVoice()
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const { showToast } = useToast()

  const inputRef = useRef<HTMLInputElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const chatHistoryLength = useRef(0)

  const smoothScrollToBottom = (smooth = true) => {
    const el = chatContainerRef.current
    if (!el) return
    const doScroll = () => {
      try {
        // @ts-ignore older lib types may not include behavior
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
      } catch {
        el.scrollTop = el.scrollHeight
      }
    }
    requestAnimationFrame(doScroll)
  }

  const sendText = async (text: string, _fromVoice: boolean) => {
    if (!text.trim() || isSending) return
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() }
    setChatHistory(h => [...h, userMsg])
    setIsSending(true)
    setChatError(null)
    try {
      const resp = await sendChat(text, isVoiceModeEnabled)
      let replyText = resp.reply || ''
      if (resp.audio) {
        try {
          await resumeAudioContext()
          const blob = base64ToBlob(resp.audio)
          if (blob) {
            setPlaybackActive(true)
            await playAudioBlob(blob, () => setPlaybackActive(false))
          } else {
            showToast('Audio unavailable. Continuing in text mode.', 'warning')
          }
        } catch (e: any) {
          showToast('Could not play audio reply. Continuing in text mode.', 'error')
          setPlaybackActive(false)
        }
      }
      setChatHistory(h => [...h, { role: 'assistant', content: replyText, timestamp: new Date() }])
      if (isVoiceModeEnabled) requestAnimationFrame(() => startListeningIfEnabled())
    } catch (err: any) {
      setChatError(err?.message || 'Failed to send message')
      showToast('Message failed. Please try again.', 'error')
    } finally {
      setIsSending(false)
      setMessage('')
      inputRef.current?.focus()
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (isListening || isPlayingAudio) return
    await sendText(message, false)
  }

  useEffect(() => {
    inputRef.current?.focus()
    if (chatContainerRef.current) smoothScrollToBottom(false)
  }, [])


  useEffect(() => {
    if (chatHistory.length !== chatHistoryLength.current) {
      chatHistoryLength.current = chatHistory.length
      smoothScrollToBottom(true)
    }
  }, [chatHistory.length, isSending])

  useEffect(() => {
    if (isListening && interimTranscript) {
      setMessage(interimTranscript)
    } else if (!isListening && message === interimTranscript) {
      setMessage('')
    }
  }, [isListening, interimTranscript])

  useEffect(() => {
    if (!finalTranscript) return
    const text = consumeFinalTranscript()
    if (text) {
      setMessage(text)
      sendText(text, true)
    }
  }, [finalTranscript])

  return (
    <Panel className="relative flex w-full flex-col lg:h-full">
      <div className="absolute inset-x-0 -top-2 flex justify-center">
        <div className="h-4 w-24 rounded-b-lg bg-slate-700"></div>
      </div>
      <div className="flex h-full flex-col">
        <div className="flex-none flex items-center justify-center pb-2">
          <button
            type="button"
            onClick={() => setVoiceModeEnabled(!isVoiceModeEnabled)}
            aria-pressed={isVoiceModeEnabled}
            className={`inline-flex items-center gap-2 rounded px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
              isVoiceModeEnabled ? 'bg-amber-500 text-black border-amber-400' : 'bg-amber-900/40 text-amber-300 border-amber-700'
            } ${isVoiceModeEnabled && isListening ? 'ring-2 ring-emerald-400 shadow-lg shadow-emerald-400/30 animate-pulse' : ''}`}
          >
            {isVoiceModeEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {isVoiceModeEnabled ? 'Order Speaker (On Air)' : 'Order Speaker'}
            {(isListening || isPlayingAudio || isSending) && (
              <span className="ml-2 inline-flex items-end gap-0.5" aria-hidden>
                <span className="h-2 w-0.5 bg-black/60 animate-[equalize_1s_ease-in-out_infinite]" />
                <span className="h-3 w-0.5 bg-black/60 animate-[equalize_1s_ease-in-out_infinite_.15s]" />
                <span className="h-1.5 w-0.5 bg-black/60 animate-[equalize_1s_ease-in-out_infinite_.3s]" />
              </span>
            )}
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden rounded-lg bg-black/30">
          <div className="h-full overflow-y-auto p-3 text-white" ref={chatContainerRef}>
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-400">
                <p className="mt-2 text-sm italic">Press Order Speaker to talk, or type below</p>
              </div>
            ) : (
              <>
                <AnimatePresence initial={false}>
                  {chatHistory.map((m, idx) => (
                    <ChatBubble key={idx} role={m.role} content={m.content} timestamp={m.timestamp} />
                  ))}
                </AnimatePresence>
                {isSending && <TypingIndicator />}
              </>
            )}
          </div>
        </div>
        {chatError && <div className="flex-none text-center text-red-500 text-sm py-2">{chatError}</div>}
        <div className="flex-none mt-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              ref={inputRef}
              placeholder={isVoiceModeEnabled ? (isListening ? 'Listening...' : 'Press Order Speaker to talk...') : 'Type your order here...'}
              disabled={isSending || isPlayingAudio || (isVoiceModeEnabled && isListening)}
              aria-busy={isVoiceModeEnabled && isListening}
              className={`flex-1 rounded-md border px-4 py-3 text-white placeholder-slate-400 focus-visible:outline-none disabled:opacity-70 disabled:cursor-not-allowed ${
                isVoiceModeEnabled && isListening
                  ? 'border-emerald-500/70 bg-emerald-900/20 ring-1 ring-emerald-500'
                  : 'border-slate-600 bg-slate-700/80 focus-visible:ring-1 focus-visible:ring-amber-500'
              }`}
            />
            <button
              type="submit"
              disabled={isSending || isListening || isPlayingAudio || !message.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500 text-black transition-all hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {isSending ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <defs>
                    <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="9" stroke="url(#ring)" strokeWidth="3" fill="none" opacity="0.35" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="url(#ring)" strokeWidth="3" strokeLinecap="round" fill="none" className="animate-spin origin-center" />
                </svg>
              ) : (
                <span className="font-bold">→</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </Panel>
  )
}
