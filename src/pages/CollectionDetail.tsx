import { useEffect, useState } from 'react'
import { supabase, type Recipe, type Collection } from '../lib/supabase'

type Props = {
  collection: Collection
  onBack: () => void
  onSelect: (recipe: Recipe) => void
}

export default function CollectionDetail({ collection, onBack, onSelect }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
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
      const { data } = await supabase.from('recipes').select('*').in('id', ids)
      if (data) setRecipes(data)
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
          <button onClick={onBack} className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
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
            <div key={recipe.id} className="border-b border-r border-stone-200 relative group">
              <div className="cursor-pointer" onClick={() => onSelect(recipe)}>
                <div className="aspect-[4/3] bg-stone-50 overflow-hidden">
                  {recipe.photo_url
                    ? <img src={recipe.photo_url} alt={recipe.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl text-stone-300">🍽️</div>
                  }
                </div>
                <div className="p-4 min-h-20">
                  <p className="font-serif text-base font-medium leading-snug">{recipe.title}</p>
                </div>
              </div>
              <button
                onClick={() => removeRecipe(recipe.id)}
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
