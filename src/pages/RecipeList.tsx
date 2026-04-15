import { useEffect, useState } from 'react'
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
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [cookCounts, setCookCounts] = useState<Record<string, number>>({})

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
    const matchTag = !activeTag || (r.tags || []).includes(activeTag)
    return matchSearch && matchTag
  })

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
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-4 py-2 rounded-full text-xs border transition-colors ${
                !activeTag
                  ? 'bg-stone-50 border-stone-900 text-stone-900'
                  : 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'
              }`}
            >
              all
            </button>
            {allTags.map(tag => (
              <button key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`px-4 py-2 rounded-full text-xs border transition-colors ${
                  activeTag === tag
                    ? 'bg-stone-50 border-stone-900 text-stone-900'
                    : 'bg-white border-stone-200 text-stone-400 hover:border-stone-300'
                }`}
              >
                {tag}
              </button>
            ))}
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
