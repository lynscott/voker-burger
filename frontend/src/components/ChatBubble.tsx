import { motion } from 'framer-motion'

export type ChatRole = 'user' | 'assistant'

export default function ChatBubble({ role, content, timestamp }: { role: ChatRole; content: string; timestamp?: Date }) {
  const time = timestamp ? timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div className={`bubble ${isUser ? 'bubble-user' : 'bubble-assistant'} max-w-[85%]`}
           aria-label={time ? `Sent at ${time}` : undefined}
      >
        <span className="leading-relaxed break-words align-middle">{content}</span>
        {time && (
          <span className="ml-2 text-xs text-white/70 align-middle">{time}</span>
        )}
      </div>
    </motion.div>
  )
}
