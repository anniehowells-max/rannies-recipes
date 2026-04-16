import { useEffect, useState } from 'react'
import { loadGroceryList } from '../pages/GroceryList'

type Screen = 'login' | 'list' | 'detail' | 'add' | 'edit' | 'grocery'

type Props = {
  screen: Screen
  onNavigate: (screen: 'list' | 'grocery' | 'add') => void
}

export default function BottomNav({ screen, onNavigate }: Props) {
  const [groceryCount, setGroceryCount] = useState(0)

  useEffect(() => {
    setGroceryCount(loadGroceryList().filter(i => !i.checked).length)
  }, [screen])

  const onRecipes = screen === 'list' || screen === 'detail' || screen === 'edit'
  const onGrocery = screen === 'grocery'

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-8 px-6 z-50 pointer-events-none">
      <nav className="pointer-events-auto flex items-center gap-1 rounded-[28px] px-3 py-3 backdrop-blur-2xl bg-white/40 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">

        {/* Recipes */}
        <button
          onClick={() => onNavigate('list')}
          className={`flex flex-col items-center gap-1 px-6 py-2 rounded-[20px] transition-all ${
            onRecipes ? 'bg-white/60 shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'hover:bg-white/30'
          }`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${onRecipes ? 'text-stone-900' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <span className={`font-ui text-[10px] font-medium tracking-wide ${onRecipes ? 'text-stone-900' : 'text-stone-400'}`}>recipes</span>
        </button>

        {/* Add */}
        <button
          onClick={() => onNavigate('add')}
          className="w-14 h-14 rounded-full bg-stone-900 hover:bg-black flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.25)] transition-all active:scale-95 mx-1"
        >
          <span className="text-white text-2xl leading-none mb-0.5">+</span>
        </button>

        {/* Grocery */}
        <button
          onClick={() => onNavigate('grocery')}
          className={`relative flex flex-col items-center gap-1 px-6 py-2 rounded-[20px] transition-all ${
            onGrocery ? 'bg-white/60 shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'hover:bg-white/30'
          }`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${onGrocery ? 'text-stone-900' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <path d="M3 6h18M16 10a4 4 0 01-8 0" />
          </svg>
          <span className={`font-ui text-[10px] font-medium tracking-wide ${onGrocery ? 'text-stone-900' : 'text-stone-400'}`}>grocery</span>
          {groceryCount > 0 && (
            <span className="absolute top-1 right-3 w-4 h-4 bg-stone-900 text-white text-[9px] rounded-full flex items-center justify-center">
              {groceryCount}
            </span>
          )}
        </button>

      </nav>
    </div>
  )
}
