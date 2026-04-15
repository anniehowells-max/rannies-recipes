import { useEffect, useRef, useState } from 'react'
import { supabase, type Recipe } from '../lib/supabase'

type Props = {
  onSelect: (recipe: Recipe) => void
  onAdd: () => void
  refreshKey: number
}

export default function RecipeList({ onSelect, onAdd, refreshKey }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [cookCounts, setCookCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setRecipes(data)

      const { data: logs } = await supabase
        .from('cook_log')
        .select('recipe_id')
      if (logs) {
        const counts: Record<string, number> = {}
        logs.forEach(l => { counts[l.recipe_id] = (counts[l.recipe_id] || 0) + 1 })
        setCookCounts(counts)
      }
      setLoading(false)
    }
    load()
  }, [refreshKey])

  const allTags = Array.from(new Set(recipes.flatMap(r => r.tags || [])))

  const filtered = recipes.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchTag = activeTags.length === 0 || activeTags.some(t => (r.tags || []).includes(t))
    return matchSearch && matchTag
  })

  function toggleTag(tag: string) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <div className="border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-end justify-between">
          <h1 className="font-serif text-4xl font-medium tracking-tight">
            Rannie's <span className="italic text-stone-900">Recipes</span>
          </h1>
          <button onClick={onAdd} className="px-4 py-2.5 bg-stone-900 hover:bg-black text-white text-sm rounded-lg transition-colors whitespace-nowrap flex-shrink-0">
            + add recipe
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search recipes..."
          className="w-full py-2.5 border-b border-stone-200 bg-transparent text-stone-800 placeholder-stone-300 focus:outline-none focus:border-stone-500 transition-colors mb-5 text-sm"
        />

        {/* Tag filters */}
        {allTags.length > 0 && (
          <div className="relative mb-6" ref={dropdownRef}>
            <button
              onClick={() => setTagDropdownOpen(o => !o)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs border transition-colors ${
                activeTags.length > 0
                  ? 'bg-stone-50 border-stone-900 text-stone-900'
                  : 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'
              }`}
            >
              {activeTags.length > 0 ? `${activeTags.length} tag${activeTags.length > 1 ? 's' : ''} selected` : 'filter by tag'}
              <span className="text-[10px]">{tagDropdownOpen ? '▲' : '▼'}</span>
            </button>
            {tagDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-10 min-w-48 py-1">
                {activeTags.length > 0 && (
                  <>
                    <button
                      onClick={() => setActiveTags([])}
                      className="w-full text-left px-4 py-2 text-xs text-stone-400 hover:text-stone-700 transition-colors"
                    >
                      clear all
                    </button>
                    <div className="border-t border-stone-100 mx-2 mb-1" />
                  </>
                )}
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="w-full text-left px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2.5"
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      activeTags.includes(tag) ? 'bg-stone-900 border-stone-900' : 'border-stone-300'
                    }`}>
                      {activeTags.includes(tag) && (
                        <svg viewBox="0 0 10 8" className="w-2 h-2 fill-white">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-bleed grid */}
      {loading ? (
        <p className="px-6 text-stone-300 text-sm">loading...</p>
      ) : filtered.length === 0 ? (
        <p className="px-6 text-stone-300 text-sm italic">no recipes yet — add your first one!</p>
      ) : (
        <div className="border-t border-stone-200 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map(recipe => (
            <div key={recipe.id} onClick={() => onSelect(recipe)}
              className="cursor-pointer group border-b border-r border-stone-200">
              <div className="aspect-[4/3] bg-stone-50 overflow-hidden">
                {recipe.photo_url
                  ? <img src={recipe.photo_url} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl text-stone-300">🍽️</div>
                }
              </div>
              <div className="p-4">
                <p className="font-serif text-base font-medium leading-snug mb-1.5 group-hover:text-stone-500 transition-colors">{recipe.title}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {(recipe.tags || []).slice(0, 2).map(tag => (
                    <span key={tag} className="text-[10px] tracking-wider uppercase text-stone-400">{tag}</span>
                  ))}
                  {(recipe.tags || []).length > 1 && cookCounts[recipe.id] && <span className="text-stone-200">·</span>}
                  {cookCounts[recipe.id] && (
                    <span className="text-[10px] tracking-wider uppercase text-stone-400">cooked {cookCounts[recipe.id]}×</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
