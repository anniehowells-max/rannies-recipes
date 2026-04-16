import { useEffect, useState } from 'react'
import { loadGroceryList } from '../pages/GroceryList'

type Screen = 'login' | 'list' | 'detail' | 'add' | 'edit' | 'grocery' | 'collections' | 'collection-detail' | 'more'

type Props = {
  screen: Screen
  onNavigate: (screen: 'list' | 'grocery' | 'add' | 'collections' | 'more') => void
}

export default function BottomNav({ screen, onNavigate }: Props) {
  const [groceryCount, setGroceryCount] = useState(0)

  useEffect(() => {
    const update = () => setGroceryCount(loadGroceryList().filter(i => !i.checked).length)
    update()
    window.addEventListener('grocery-list-updated', update)
    return () => window.removeEventListener('grocery-list-updated', update)
  }, [screen])

  const onRecipes = screen === 'list' || screen === 'detail' || screen === 'edit'
  const onCollections = screen === 'collections' || screen === 'collection-detail'
  const onGrocery = screen === 'grocery'
  const onMore = screen === 'more'

  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center pb-8 px-2 z-50 pointer-events-none">
      <nav className="pointer-events-auto flex items-center gap-1 rounded-full px-2 py-3 w-full max-w-sm backdrop-blur-2xl bg-white/70 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.8)]">

        {/* Recipes */}
        <button
          onClick={() => onNavigate('list')}
          className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-full transition-all ${
            onRecipes ? 'bg-white/60 shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'hover:bg-white/30'
          }`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${onRecipes ? 'text-stone-900' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <span className={`font-ui text-[10px] font-medium tracking-wide ${onRecipes ? 'text-stone-900' : 'text-stone-400'}`}>recipes</span>
        </button>

        {/* Collections */}
        <button
          onClick={() => onNavigate('collections')}
          className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-full transition-all ${
            onCollections ? 'bg-white/60 shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'hover:bg-white/30'
          }`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${onCollections ? 'text-stone-900' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
          </svg>
          <span className={`font-ui text-[10px] font-medium tracking-wide ${onCollections ? 'text-stone-900' : 'text-stone-400'}`}>collections</span>
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
          className={`relative flex flex-col items-center gap-1 flex-1 py-2 rounded-full transition-all ${
            onGrocery ? 'bg-white/60 shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'hover:bg-white/30'
          }`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${onGrocery ? 'text-stone-900' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <path d="M3 6h18M16 10a4 4 0 01-8 0" />
          </svg>
          <span className={`font-ui text-[10px] font-medium tracking-wide ${onGrocery ? 'text-stone-900' : 'text-stone-400'}`}>groceries</span>
          {groceryCount > 0 && (
            <span className="absolute top-1 right-3 w-4 h-4 bg-stone-900 text-white text-[9px] rounded-full flex items-center justify-center">
              {groceryCount}
            </span>
          )}
        </button>

        {/* More */}
        <button
          onClick={() => onNavigate('more')}
          className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-full transition-all ${
            onMore ? 'bg-white/60 shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'hover:bg-white/30'
          }`}
        >
          <svg viewBox="0 0 24 24" className={`w-5 h-5 ${onMore ? 'text-stone-900' : 'text-stone-400'}`} fill="currentColor" stroke="none">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
          <span className={`font-ui text-[10px] font-medium tracking-wide ${onMore ? 'text-stone-900' : 'text-stone-400'}`}>more</span>
        </button>

      </nav>
    </div>
  )
}
