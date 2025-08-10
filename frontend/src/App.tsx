import React from 'react'

function App() {
  return (
    <div className="container mx-auto flex h-screen max-w-6xl flex-col overflow-hidden px-4 py-4">
      {/* Header */}
      <div className="flex-none text-center mb-6 pb-4 relative">
        <h1 className="neon-text relative z-10 text-4xl font-extrabold tracking-tighter text-white md:text-5xl lg:text-6xl">
          <span className="text-shadow block bg-gradient-to-b from-orange-300 to-amber-600 bg-clip-text text-transparent">
            Bada Bing Burgers
          </span>
        </h1>
        <p className="relative z-10 mt-2 text-sm text-gray-300 md:text-base">
          Home of the deathly delicious White Lotus burger
        </p>
      </div>

      {/* Stats Dashboard */}
      <section className="mb-4 flex-none flex flex-row gap-4">
        <div className="flex-1">
          <div className="stats-counter relative overflow-hidden rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <div className="flex flex-col items-center space-y-2">
              <div className="text-3xl" aria-hidden="true">🍔</div>
              <div className="relative h-12 w-full overflow-hidden text-center">
                <span className="text-4xl font-bold tabular-nums">0</span>
              </div>
              <div className="text-sm font-medium text-muted-foreground">Total Burgers</div>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div className="stats-counter relative overflow-hidden rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <div className="flex flex-col items-center space-y-2">
              <div className="text-3xl" aria-hidden="true">🍟</div>
              <div className="relative h-12 w-full overflow-hidden text-center">
                <span className="text-4xl font-bold tabular-nums">0</span>
              </div>
              <div className="text-sm font-medium text-muted-foreground">Total Fries</div>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div className="stats-counter relative overflow-hidden rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
            <div className="flex flex-col items-center space-y-2">
              <div className="text-3xl" aria-hidden="true">🥤</div>
              <div className="relative h-12 w-full overflow-hidden text-center">
                <span className="text-4xl font-bold tabular-nums">0</span>
              </div>
              <div className="text-sm font-medium text-muted-foreground">Total Drinks</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto lg:flex-row">
        <div className="flex min-h-0 lg:h-full lg:w-2/3">
          {/* DriveThruIntercom component TODO */}
          <div className="drive-thru-intercom relative flex w-full flex-col rounded-xl border bg-gradient-to-b from-slate-800 to-slate-900 shadow-lg lg:h-full p-6">
            <div className="absolute inset-x-0 top-0 flex justify-center">
              <div className="h-4 w-24 rounded-b-lg bg-slate-700" />
            </div>
            <div className="flex-none flex items-center justify-center pb-2">
              <div className="rounded bg-amber-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-black">
                Order Speaker
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden rounded-lg bg-black/30" />
          </div>
        </div>
        <div className="flex min-h-0 lg:h-full lg:w-1/3">
          {/* OrderBoard component TODO */}
          <div className="order-board flex h-full w-full flex-col rounded-lg border bg-card shadow-sm">
            <div className="flex-none border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Order History</h2>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
                <span className="text-lg">⟳</span>
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4" />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-4 flex-none text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Bada Bing Burgers Drive-Thru</p>
      </footer>
    </div>
  )
}

export default App
