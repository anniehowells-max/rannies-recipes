import { useEffect, useState } from 'react'
import { supabase, type Recipe, type Collection } from '../lib/supabase'

type Props = {
  collection: Collection
  onBack: () => void
  onSelect: (recipe: Recipe) => void
}

export default function CollectionDetail({ collection, onBack, onSelect }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [cookCounts, setCookCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [collection.id])

  async function load() {
    setLoading(true)
    const { data: links } = await supabase
      .from('collection_recipes')
      .select('recipe_id')
      .eq('collection_id', collection.id)

    if (links && links.length > 0) {
      const ids = links.map(l => l.recipe_id)
      const [{ data }, { data: logs }] = await Promise.all([
        supabase.from('recipes').select('*').in('id', ids),
        supabase.from('cook_log').select('recipe_id').in('recipe_id', ids),
      ])
      if (data) setRecipes(data)
      if (logs) {
        const counts: Record<string, number> = {}
        logs.forEach(l => { counts[l.recipe_id] = (counts[l.recipe_id] || 0) + 1 })
        setCookCounts(counts)
      }
    } else {
      setRecipes([])
    }
    setLoading(false)
  }

  async function removeRecipe(recipeId: string) {
    await supabase
      .from('collection_recipes')
      .delete()
      .eq('collection_id', collection.id)
      .eq('recipe_id', recipeId)
    setRecipes(prev => prev.filter(r => r.id !== recipeId))
  }

  return (
    <div className="min-h-screen bg-white pb-32">

      {/* Top nav */}
      <div className="border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-3">
          <button onClick={onBack} className="font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors">
            ← back
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <h1 className="font-serif text-4xl font-medium tracking-tight italic">{collection.name}</h1>
          {!loading && (
            <p className="font-ui text-xs text-stone-400 tracking-wide mt-1">
              {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <p className="px-6 pt-6 text-stone-300 text-sm">loading...</p>
      ) : recipes.length === 0 ? (
        <p className="px-6 pt-6 text-stone-300 text-sm italic">no recipes in this collection yet — add some from a recipe's page</p>
      ) : (
        <div className="border-t border-stone-200 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {recipes.map(recipe => (
            <div key={recipe.id} onClick={() => onSelect(recipe)}
              className="cursor-pointer group border-b border-r border-stone-200 relative">
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
              <button
                onClick={e => { e.stopPropagation(); removeRecipe(recipe.id) }}
                title="Remove from collection"
                className="absolute top-2 right-2 w-6 h-6 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-white transition-colors opacity-0 group-hover:opacity-100 text-sm leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
