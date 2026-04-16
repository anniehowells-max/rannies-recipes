import { useEffect, useRef, useState } from 'react'
import { supabase, type Recipe } from '../lib/supabase'

type Props = {
  onSelect: (recipe: Recipe) => void
  refreshKey: number
}

export default function RecipeList({ onSelect, refreshKey }: Props) {
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

  const allTags = Array.from(new Set(recipes.flatMap(r => r.tags || []))).sort()

  const filtered = recipes.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchTag = activeTags.length === 0 || activeTags.every(t => (r.tags || []).includes(t))
    return matchSearch && matchTag
  })

  function toggleTag(tag: string) {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  return (
    <div className="min-h-screen bg-white pb-32">

      {/* Header */}
      <div className="border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-end justify-between">
          <h1 className="font-serif text-4xl font-medium tracking-tight">
            Rannie's <span className="italic text-stone-900">Recipes</span>
          </h1>
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
              className={`font-ui uppercase tracking-wider w-full flex items-center gap-2 px-5 py-3 rounded-full text-sm border transition-colors ${
                activeTags.length > 0
                  ? 'bg-stone-50 border-stone-900 text-stone-900'
                  : 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'
              }`}
            >
              {activeTags.length > 0 ? `${activeTags.length} tag${activeTags.length > 1 ? 's' : ''} selected` : 'filter by tag'}
              <svg viewBox="0 0 24 24" className={`w-3.5 h-3.5 ml-auto transition-transform duration-200 ${tagDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {tagDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg z-10 py-1">
                {activeTags.length > 0 && (
                  <>
                    <button
                      onClick={() => setActiveTags([])}
                      className="w-full text-left px-4 py-3 text-sm text-stone-400 hover:text-stone-700 transition-colors"
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
                    className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-3"
                  >
                    <span className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      activeTags.includes(tag) ? 'bg-stone-900 border-stone-900' : 'border-stone-300'
                    }`}>
                      {activeTags.includes(tag) && (
                        <svg viewBox="0 0 10 8" className="w-3 h-3 fill-white">
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
              <div className="aspect-[4/3] bg-stone-50 overflow-hidden relative">
                {recipe.photo_url
                  ? <img src={recipe.photo_url} alt={recipe.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl text-stone-300">🍽️</div>
                }
                {!cookCounts[recipe.id] && (
                  <span className="font-ui absolute top-2 left-2 bg-stone-900 text-white text-[10px] tracking-widest uppercase px-2 py-1 rounded-full">new</span>
                )}
              </div>
              <div className="p-4 flex flex-col gap-2 min-h-36">
                <p className="font-serif text-base font-medium leading-snug">{recipe.title}</p>
                {((recipe.prep_time_mins ?? 0) + (recipe.cook_time_mins ?? 0)) > 0 && (() => {
                  const total = (recipe.prep_time_mins ?? 0) + (recipe.cook_time_mins ?? 0)
                  const display = total > 59
                    ? `${Math.floor(total / 60)} h${total % 60 > 0 ? ` ${total % 60} mins` : ''}`
                    : `${total} mins`
                  return (
                    <span className="font-ui text-[10px] tracking-wider uppercase text-stone-400 flex items-center gap-1">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {display}
                    </span>
                  )
                })()}
                {(recipe.rating != null || cookCounts[recipe.id] > 0) && (
                  <div className="flex items-center gap-2">
                    {cookCounts[recipe.id] > 0 && (
                      <span className="font-ui text-[10px] tracking-wider uppercase text-stone-400">cooked {cookCounts[recipe.id]} {cookCounts[recipe.id] === 1 ? 'time' : 'times'}</span>
                    )}
                    {recipe.rating != null && (
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(star => {
                          const filled = star <= (recipe.rating as number)
                          return (
                            <svg key={star} viewBox="0 0 24 24" className="w-2.5 h-2.5">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                fill={filled ? '#1c1917' : 'none'} stroke={filled ? '#1c1917' : '#d6d3d1'} strokeWidth="1.5" />
                            </svg>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-auto border-t border-stone-100 pt-2 flex items-center gap-2 flex-wrap">
                  {(recipe.tags || []).map(tag => (
                    <span key={tag} className="font-ui text-[10px] bg-stone-50 border border-stone-900 text-stone-900 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
