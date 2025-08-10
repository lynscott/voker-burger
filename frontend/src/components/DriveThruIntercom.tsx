import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { useVoice } from '../context/VoiceContext'
import { sendChat } from '../api/chat'
import { base64ToBlob, playAudioBlob } from '../services/audioService'

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
    if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
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
      setTimeout(() => {
        if (chatContainerRef.current) chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }, 0)
    }
  }, [chatHistory.length])

  return (
    <div className="drive-thru-intercom relative flex w-full flex-col rounded-xl border bg-gradient-to-b from-slate-800 to-slate-900 shadow-lg lg:h-full">
      <div className="absolute inset-x-0 top-0 flex justify-center">
        <div className="h-4 w-24 rounded-b-lg bg-slate-700"></div>
      </div>
      <div className="flex h-full flex-col p-6">
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
              chatHistory.map((m, idx) => (
                <div key={idx} className={`mb-2 ${m.role === 'user' ? 'text-right' : ''}`}>
                  <div className={`inline-block max-w-[85%] rounded px-3 py-2 ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>{m.content}</div>
                </div>
              ))
            )}
          </div>
        </div>
        {chatError && <div className="flex-none text-center text-red-500 text-sm py-2">{chatError}</div>}
        <div className="flex-none mt-4 space-y-2">
          <label className="flex items-center justify-left cursor-pointer group">
            <input type="checkbox" checked={isVoiceModeEnabled} onChange={(e) => setVoiceModeEnabled(e.target.checked)} className="absolute opacity-0 w-0 h-0 peer" id="voice-toggle-checkbox" />
            <span className="w-10 h-10 rounded-md border border-amber-700 bg-amber-900/50 flex items-center justify-center text-amber-400 transition-colors duration-200 ease-in-out peer-checked:bg-amber-600 peer-checked:text-white peer-checked:border-amber-400 group-hover:border-amber-500" aria-hidden>
              {isVoiceModeEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </span>
            <span className="text-xs ml-2 text-slate-300">{isVoiceModeEnabled ? 'Exit voice mode' : 'Speak to attendant'}</span>
          </label>
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} ref={inputRef} placeholder={isVoiceModeEnabled ? (isListening ? 'Listening...' : 'Press mic or type...') : 'Type your order here...'} disabled={isSending || isPlayingAudio || (isVoiceModeEnabled && isListening)} className="w-full rounded-l-lg border border-slate-600 bg-slate-700/80 px-4 py-3 pr-24 text-white placeholder-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 disabled:opacity-70 disabled:cursor-not-allowed" />
            {isVoiceModeEnabled && (
              <button type="button" onClick={() => (isListening ? setVoiceModeEnabled(false) : setVoiceModeEnabled(true))} disabled={isSending || isPlayingAudio} className={`absolute right-12 flex h-10 w-10 items-center justify-center rounded-full ${isListening ? 'bg-red-600 hover:bg-red-500 ring-2 ring-red-400 animate-pulse' : 'bg-blue-600 hover:bg-blue-500'} text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mr-1`} aria-label={isListening ? 'Stop Listening' : 'Start Listening'}>
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
            <button type="submit" disabled={isSending || isListening || isPlayingAudio || !message.trim()} className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-r-lg bg-amber-500 text-black transition-all hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Send message">
              {isSending ? <span className="animate-spin text-lg">⟳</span> : <span className="font-bold">→</span>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
