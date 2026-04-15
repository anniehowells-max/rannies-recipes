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
  const [logAuthor, setLogAuthor] = useState('')
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
      .insert({ recipe_id: recipe.id, note: logNote.trim(), cooked_by: logAuthor.trim() || null })
      .select()
      .single()
    if (data) setLog(prev => [data, ...prev])
    setLogNote('')
    setLogAuthor('')
    setSaving(false)
  }

  async function deleteLogEntry(id: string) {
    await supabase.from('cook_log').delete().eq('id', id)
    setLog(prev => prev.filter(e => e.id !== id))
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
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm flex items-center gap-1 transition-colors">
            ← back to recipes
          </button>
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors">edit</button>
            <button onClick={handleDelete} className="px-4 py-1.5 bg-stone-200 hover:bg-red-100 hover:text-red-600 text-stone-600 text-sm rounded-lg transition-colors">delete</button>
          </div>
        </div>

        {recipe.photo_url ? (
          <img src={recipe.photo_url} alt={recipe.title} className="w-full h-56 object-cover rounded-2xl mb-6" />
        ) : (
          <div className="w-full h-40 bg-green-50 rounded-2xl flex items-center justify-center text-6xl mb-6">🍽️</div>
        )}

        <div className="mb-3">
          <h1 className="font-serif text-3xl font-medium">{recipe.title}</h1>
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          {(recipe.tags || []).map(tag => (
            <span key={tag} className="text-xs bg-green-50 border border-green-600 text-green-700 px-3 py-1 rounded-full">{tag}</span>
          ))}
        </div>

        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noreferrer" className="text-sm text-green-600 hover:text-green-700 mb-6 block">
            ↗ view original source
          </a>
        )}

        <div className="grid md:grid-cols-2 gap-8 mt-8 mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-stone-600 mb-3">ingredients</p>
            <ul className="space-y-2">
              {(recipe.ingredients || []).map((ing, i) => (
                <li key={i} className="flex items-start gap-2.5 text-base">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 flex-shrink-0 mt-1.5" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-stone-600 mb-3">method</p>
            <ol className="space-y-3">
              {(recipe.steps || []).map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-base">
                  <span className="w-6 h-6 rounded-full bg-green-50 text-green-700 text-sm font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {recipe.notes && (
          <div className="bg-green-50 border-l-4 border-green-600 rounded-r-xl px-4 py-3 mb-8">
            <p className="text-base text-green-800 italic leading-relaxed">{recipe.notes}</p>
          </div>
        )}

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-stone-600 mb-4">cooking log</p>

          <div className="flex flex-col gap-2 mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={logNote}
                onChange={e => setLogNote(e.target.value)}
                placeholder="add a note about tonight's cook..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-green-600 transition-colors"
              />
              <input
                type="text"
                value={logAuthor}
                onChange={e => setLogAuthor(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addLogEntry() }}
                placeholder="who cooked?"
                className="w-32 px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-green-600 transition-colors"
              />
            </div>
            <button
              onClick={addLogEntry}
              disabled={saving || !logNote.trim()}
              className="self-end px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
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
                  <div className="w-2 h-2 rounded-full bg-green-600 flex-shrink-0 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-green-600 mb-0.5">
                      {formatDate(entry.cooked_at)}{entry.cooked_by && <span className="text-stone-400 font-normal"> · {entry.cooked_by}</span>}
                    </p>
                    {entry.note && <p className="text-base text-stone-500 italic">{entry.note}</p>}
                  </div>
                  <button
                    onClick={() => deleteLogEntry(entry.id)}
                    className="text-xs text-stone-200 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  >
                    delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
