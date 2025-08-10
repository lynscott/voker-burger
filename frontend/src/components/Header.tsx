import React from 'react'

export default function Header() {
  return (
    <div className="text-center mb-6 pb-4 relative">
      <h1 className="neon-text relative z-10 text-4xl font-extrabold tracking-tighter text-white md:text-5xl lg:text-6xl">
        <span className="text-shadow block bg-gradient-to-b from-orange-300 to-amber-600 bg-clip-text text-transparent">
          Bada Bing Burgers
        </span>
      </h1>
      <p className="relative z-10 mt-2 text-sm text-gray-300 md:text-base">
        Home of the deathly delicious White Lotus burger
      </p>
    </div>
  )
}
