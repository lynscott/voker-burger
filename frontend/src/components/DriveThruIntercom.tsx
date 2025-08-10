import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { useVoice } from '../context/VoiceContext'
import { sendChat } from '../api/chat'
import { base64ToBlob, playAudioBlob } from '../services/audioService'
import Panel from './Panel'
import { motion, AnimatePresence } from 'framer-motion'
import ChatBubble from './ChatBubble'
import TypingIndicator from './TypingIndicator'

interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp?: Date }

export default function DriveThruIntercom() {
  const { isVoiceModeEnabled, setVoiceModeEnabled, isListening, isPlayingAudio } = useVoice()
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const chatContainerRef = useRef<HTMLDivElement | null>(null)
  const waveformContainerRef = useRef<HTMLDivElement | null>(null)
  const waveformRef = useRef<SVGSVGElement | null>(null)
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!message.trim() || isSending || isListening || isPlayingAudio) return
    const userMsg: ChatMessage = { role: 'user', content: message, timestamp: new Date() }
    setChatHistory(h => [...h, userMsg])
    setIsSending(true)
    setChatError(null)
    try {
      const resp = await sendChat(message, isVoiceModeEnabled)
      let replyText = resp.reply || ''
      if (resp.audio) {
        const blob = base64ToBlob(resp.audio)
        if (blob) await playAudioBlob(blob)
      }
      setChatHistory(h => [...h, { role: 'assistant', content: replyText, timestamp: new Date() }])
    } catch (err: any) {
      setChatError(err?.message || 'Failed to send message')
    } finally {
      setIsSending(false)
      setMessage('')
      inputRef.current?.focus()
    }
  }

  const createWaveform = () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 100 20')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    svg.classList.add('waveform')
    for (let i = 0; i < 5; i++) {
      const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      bar.setAttribute('x', String(i * 20 + 10))
      bar.setAttribute('y', '9')
      bar.setAttribute('width', '3')
      bar.setAttribute('height', '1')
      bar.setAttribute('fill', 'currentColor')
      bar.classList.add('waveform-bar')
      svg.appendChild(bar)
    }
    return svg
  }

  useEffect(() => {
    waveformRef.current = createWaveform()
    if (waveformContainerRef.current && waveformRef.current) waveformContainerRef.current.appendChild(waveformRef.current)
    inputRef.current?.focus()
    if (chatContainerRef.current) smoothScrollToBottom(false)
    return () => {
      if (waveformRef.current && waveformContainerRef.current?.contains(waveformRef.current)) waveformContainerRef.current.removeChild(waveformRef.current)
    }
  }, [])

  useEffect(() => {
    if (!waveformRef.current) return
    if (isSending || isPlayingAudio) waveformRef.current.classList.add('animate')
    else waveformRef.current.classList.remove('animate')
  }, [isSending, isPlayingAudio])

  useEffect(() => {
    if (chatHistory.length !== chatHistoryLength.current) {
      chatHistoryLength.current = chatHistory.length
      smoothScrollToBottom(true)
    }
  }, [chatHistory.length, isSending])

  return (
    <Panel className="relative flex w-full flex-col lg:h-full">
      <div className="absolute inset-x-0 -top-2 flex justify-center">
        <div className="h-4 w-24 rounded-b-lg bg-slate-700"></div>
      </div>
      <div className="flex h-full flex-col">
        <div className="flex-none flex items-center justify-center pb-2">
          <div className="rounded bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">Order Speaker</div>
        </div>
        <div className="flex-none mx-auto h-8 w-32 text-amber-500 pb-2 flex items-center justify-center" ref={waveformContainerRef}>
          {isPlayingAudio && <Volume2 className="h-5 w-5 animate-pulse text-amber-400 ml-2" />}
        </div>
        <div className="flex-1 min-h-0 overflow-hidden rounded-lg bg-black/30">
          <div className="h-full overflow-y-auto p-3 text-white" ref={chatContainerRef}>
            {chatHistory.length === 0 ? (
              <div className="text-center text-gray-400">
                <p className="mt-2 text-sm italic">Try asking "I'd like to order a burger" or "How many orders are active?"</p>
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
            <button
              type="button"
              onClick={() => setVoiceModeEnabled(!isVoiceModeEnabled)}
              disabled={isSending || isPlayingAudio}
              className={`flex h-10 w-10 items-center justify-center rounded-md border ${isVoiceModeEnabled ? 'border-amber-400 bg-amber-600 text-white' : 'border-amber-700 bg-amber-900/50 text-amber-400'} transition-colors`}
              aria-label="Toggle voice mode"
            >
              {isVoiceModeEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              ref={inputRef}
              placeholder={isVoiceModeEnabled ? (isListening ? 'Listening...' : 'Press mic or type...') : 'Type your order here...'}
              disabled={isSending || isPlayingAudio || (isVoiceModeEnabled && isListening)}
              className="flex-1 rounded-md border border-slate-600 bg-slate-700/80 px-4 py-3 text-white placeholder-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 disabled:opacity-70 disabled:cursor-not-allowed"
            />
            {isVoiceModeEnabled && (
              <button
                type="button"
                onClick={() => (isListening ? setVoiceModeEnabled(false) : setVoiceModeEnabled(true))}
                disabled={isSending || isPlayingAudio}
                className={`flex h-10 w-10 items-center justify-center rounded-md ${isListening ? 'bg-red-600 hover:bg-red-500 ring-2 ring-red-400 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'} text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={isListening ? 'Stop Listening' : 'Start Listening'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <button
              type="submit"
              disabled={isSending || isListening || isPlayingAudio || !message.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-500 text-black transition-all hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {isSending ? <span className="animate-spin text-lg">⟳</span> : <span className="font-bold">→</span>}
            </button>
          </form>
        </div>
      </div>
    </Panel>
  )
}
