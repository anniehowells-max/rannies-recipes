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
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-3xl font-medium">
            Rannie's <span className="italic text-green-600">Recipes</span>
          </h1>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            + add recipe
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search recipes..."
          className="w-full px-4 py-2.5 rounded-lg border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:border-green-600 transition-colors mb-4"
        />

        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-6">
            <button
              onClick={() => setActiveTag(null)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                !activeTag
                  ? 'bg-green-50 border-green-600 text-green-700'
                  : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
              }`}
            >
              all
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag === activeTag ? null : tag)}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  activeTag === tag
                    ? 'bg-green-50 border-green-600 text-green-700'
                    : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-stone-400 text-sm">loading recipes...</p>
        ) : filtered.length === 0 ? (
          <p className="text-stone-400 text-sm">no recipes yet — add your first one!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map(recipe => (
              <div
                key={recipe.id}
                onClick={() => onSelect(recipe)}
                className="bg-white border border-stone-100 rounded-xl overflow-hidden cursor-pointer hover:border-green-400 hover:-translate-y-0.5 transition-all"
              >
                <div className="h-32 bg-green-50 flex items-center justify-center text-4xl">
                  {recipe.photo_url
                    ? <img src={recipe.photo_url} alt={recipe.title} className="w-full h-full object-cover" />
                    : '🍽️'
                  }
                </div>
                <div className="p-3">
                  <p className="font-serif text-sm font-medium leading-snug mb-1.5">{recipe.title}</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(recipe.tags || []).slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs bg-green-50 border border-green-600 text-green-700 px-3 py-1 rounded-full">{tag}</span>
                    ))}
                    {cookCounts[recipe.id] && (
                      <span className="text-xs text-stone-400">cooked {cookCounts[recipe.id]}×</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
