import React from 'react'
import { motion } from 'framer-motion'

export default function Header() {
  return (
    <motion.div className="text-center mb-6 pb-4 relative" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
      <h1 className="neon-text relative z-10 text-4xl font-extrabold tracking-tighter text-white md:text-5xl lg:text-6xl">
        <span className="text-shadow block bg-gradient-to-b from-orange-300 to-amber-600 bg-clip-text text-transparent">
          Bada Bing Burgers
        </span>
      </h1>
      <p className="relative z-10 mt-2 text-sm text-gray-300 md:text-base">
        Home of the deathly delicious White Lotus burger
      </p>
    </motion.div>
  )
}
