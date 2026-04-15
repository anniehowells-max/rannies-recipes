import { useEffect, useState } from 'react'
import { supabase, type Recipe, type CookEntry } from '../lib/supabase'

type Props = {
  recipe: Recipe
  onBack: () => void
  onDelete: () => void
  onEdit: () => void
}

export default function RecipeDetail({ recipe, onBack, onDelete, onEdit }: Props) {
  const [log, setLog] = useState<CookEntry[]>([])
  const [logNote, setLogNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('cook_log')
      .select('*')
      .eq('recipe_id', recipe.id)
      .order('cooked_at', { ascending: false })
      .then(({ data }) => { if (data) setLog(data) })
  }, [recipe.id])

  async function addLogEntry() {
    if (!logNote.trim()) return
    setSaving(true)
    const { data } = await supabase
      .from('cook_log')
      .insert({ recipe_id: recipe.id, note: logNote.trim() })
      .select()
      .single()
    if (data) setLog(prev => [data, ...prev])
    setLogNote('')
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${recipe.title}"? This can't be undone.`)) return
    await supabase.from('recipes').delete().eq('id', recipe.id)
    onDelete()
  }

  function formatDate(str: string) {
    return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm mb-6 flex items-center gap-1 transition-colors">
          ← back to recipes
        </button>

        {recipe.photo_url ? (
          <img src={recipe.photo_url} alt={recipe.title} className="w-full h-56 object-cover rounded-2xl mb-6" />
        ) : (
          <div className="w-full h-40 bg-amber-50 rounded-2xl flex items-center justify-center text-6xl mb-6">🍽️</div>
        )}

        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="font-serif text-3xl font-medium">{recipe.title}</h1>
          <div className="flex gap-3 flex-shrink-0 mt-1">
            <button onClick={onEdit} className="text-xs text-stone-300 hover:text-amber-600 transition-colors">edit</button>
            <button onClick={handleDelete} className="text-xs text-stone-300 hover:text-red-400 transition-colors">delete</button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          {(recipe.tags || []).map(tag => (
            <span key={tag} className="text-xs bg-amber-50 text-amber-700 px-3 py-1 rounded-full">{tag}</span>
          ))}
        </div>

        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noreferrer" className="text-sm text-amber-600 hover:text-amber-700 mb-6 block">
            ↗ view original source
          </a>
        )}

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">ingredients</p>
            <ul className="space-y-2">
              {(recipe.ingredients || []).map((ing, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-600 flex-shrink-0 mt-1.5" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">method</p>
            <ol className="space-y-3">
              {(recipe.steps || []).map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {recipe.notes && (
          <div className="bg-amber-50 border-l-4 border-amber-600 rounded-r-xl px-4 py-3 mb-8">
            <p className="text-sm text-amber-800 italic leading-relaxed">{recipe.notes}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">cooking log</p>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={logNote}
              onChange={e => setLogNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addLogEntry() }}
              placeholder="add a note about tonight's cook..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-amber-600 transition-colors"
            />
            <button
              onClick={addLogEntry}
              disabled={saving || !logNote.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
            >
              log it
            </button>
          </div>

          {log.length === 0 ? (
            <p className="text-stone-400 text-sm">no cooks logged yet</p>
          ) : (
            <div className="space-y-0">
              {log.map((entry, i) => (
                <div key={entry.id} className={`flex items-start gap-3 py-3 ${i < log.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <div className="w-2 h-2 rounded-full bg-amber-600 flex-shrink-0 mt-1.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-600 mb-0.5">{formatDate(entry.cooked_at)}</p>
                    {entry.note && <p className="text-sm text-stone-500 italic">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
