import React from 'react'
import Header from './components/Header'
import StatsCounter from './components/StatsCounter'
import DriveThruIntercom from './components/DriveThruIntercom'
import OrderBoard from './components/OrderBoard'
import { useOrders } from './hooks/useOrders'
import { VoiceProvider } from './context/VoiceContext'

function App() {
  const { totals } = useOrders()

  return (
    <VoiceProvider>
      <div className="container mx-auto flex h-screen max-w-6xl flex-col overflow-hidden px-4 py-4">
        <div className="flex-none"><Header /></div>
        <section className="mb-4 flex-none flex flex-row gap-4">
          <div className="flex-1"><StatsCounter icon="🍔" label="Total Burgers" value={totals.burger} /></div>
          <div className="flex-1"><StatsCounter icon="🍟" label="Total Fries" value={totals.fries} /></div>
          <div className="flex-1"><StatsCounter icon="🥤" label="Total Drinks" value={totals.drink} /></div>
        </section>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto lg:flex-row">
          <div className="flex min-h-0 lg:h-full lg:w-2/3"><DriveThruIntercom /></div>
          <div className="flex min-h-0 lg:h-full lg:w-1/3"><OrderBoard /></div>
        </div>
        <footer className="mt-4 flex-none text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Bada Bing Burgers Drive-Thru</p>
        </footer>
      </div>
    </VoiceProvider>
  )
}

export default App
