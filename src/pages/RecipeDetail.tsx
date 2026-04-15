import { useEffect, useState } from 'react'
import { supabase, type Recipe, type CookEntry } from '../lib/supabase'

type Props = {
  recipe: Recipe
  onBack: () => void
  onDelete: () => void
  onEdit: () => void
}

export default function RecipeDetail({ recipe, onBack, onDelete, onEdit }: Props) {
  const [rating, setRating] = useState<number | null>(recipe.rating)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [portions, setPortions] = useState<number>(recipe.portions ?? 1)
  const [log, setLog] = useState<CookEntry[]>([])
  const [logNote, setLogNote] = useState('')
  const [logAuthor, setLogAuthor] = useState('')
  const [logError, setLogError] = useState('')
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
    setLogError('')
    const { data, error } = await supabase
      .from('cook_log')
      .insert({ recipe_id: recipe.id, note: logNote.trim(), cooked_by: logAuthor.trim() || null })
      .select()
      .single()
    if (error) {
      setLogError('couldn\'t save — ' + error.message)
    } else if (data) {
      setLog(prev => [data, ...prev])
      setLogNote('')
      setLogAuthor('')
    }
    setSaving(false)
  }

  async function deleteLogEntry(id: string) {
    if (!confirm('Delete this log entry? This can\'t be undone.')) return
    await supabase.from('cook_log').delete().eq('id', id)
    setLog(prev => prev.filter(e => e.id !== id))
  }

  async function handleRate(stars: number) {
    const newRating = stars === rating ? null : stars
    setRating(newRating)
    await supabase.from('recipes').update({ rating: newRating }).eq('id', recipe.id)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${recipe.title}"? This can't be undone.`)) return
    await supabase.from('recipes').delete().eq('id', recipe.id)
    onDelete()
  }

  function parseFraction(s: string): number {
    const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
    if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3])
    const frac = s.match(/^(\d+)\/(\d+)$/)
    if (frac) return parseInt(frac[1]) / parseInt(frac[2])
    return parseFloat(s)
  }

  function formatAmount(n: number): string {
    if (n === Math.round(n)) return String(Math.round(n))
    const whole = Math.floor(n)
    const dec = n - whole
    const fracs: [number, string][] = [[0.25,'¼'],[0.33,'⅓'],[0.5,'½'],[0.67,'⅔'],[0.75,'¾']]
    for (const [val, sym] of fracs) {
      if (Math.abs(dec - val) < 0.07) return whole > 0 ? `${whole} ${sym}` : sym
    }
    return n % 1 === 0 ? String(n) : n.toFixed(1)
  }

  function scaleIngredient(ingredient: string): string {
    if (!recipe.portions) return ingredient
    const factor = portions / recipe.portions
    return ingredient.replace(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/, match =>
      formatAmount(parseFraction(match) * factor)
    )
  }

  function formatDate(str: string) {
    return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-stone-200">
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
          <img src={recipe.photo_url} alt={recipe.title} className="w-full h-56 object-cover rounded-xl mb-6" />
        ) : (
          <div className="w-full h-40 bg-green-50 rounded-xl flex items-center justify-center text-6xl mb-6">🍽️</div>
        )}

        <div className="bg-white rounded-xl px-5 py-4 mb-4">
          <h1 className="font-serif text-3xl font-medium mb-3">{recipe.title}</h1>
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map(star => {
              const filled = star <= (hoverRating ?? rating ?? 0)
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="transition-transform hover:scale-110"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" strokeLinejoin="round" strokeLinecap="round">
                    <path
                      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      fill={filled ? '#16a34a' : 'none'}
                      stroke={filled ? '#16a34a' : '#d6d3d1'}
                      strokeWidth="1.5"
                    />
                  </svg>
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 flex-wrap">
            {(recipe.tags || []).map(tag => (
              <span key={tag} className="text-xs bg-green-50 border border-green-600 text-green-700 px-3 py-1 rounded-full">{tag}</span>
            ))}
          </div>
          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noreferrer" className="text-sm text-green-600 hover:text-green-700 mt-3 block">
              ↗ view original source
            </a>
          )}
          {recipe.portions && (
            <div className="flex items-center gap-3 mt-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-stone-600">portions</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPortions(p => Math.max(1, p - 1))}
                  className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm flex items-center justify-center transition-colors"
                >−</button>
                <span className="text-sm font-medium w-4 text-center">{portions}</span>
                <button
                  onClick={() => setPortions(p => p + 1)}
                  className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm flex items-center justify-center transition-colors"
                >+</button>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl px-5 py-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-stone-600 mb-3">ingredients</p>
            <ul className="space-y-2">
              {(recipe.ingredients || []).map((ing, i) => (
                <li key={i} className="flex items-start gap-2.5 text-base">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600 flex-shrink-0 mt-1.5" />
                  {scaleIngredient(ing)}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl px-5 py-4">
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
          <div className="bg-green-50 border-l-4 border-green-600 rounded-r-2xl px-5 py-4 mb-4">
            <p className="text-base text-green-800 italic leading-relaxed">{recipe.notes}</p>
          </div>
        )}

        <div className="bg-white rounded-xl px-5 py-4 mb-4">
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
            <div className="flex items-center gap-3 self-end">
              {logError && <p className="text-red-400 text-xs">{logError}</p>}
              <button
                onClick={addLogEntry}
                disabled={saving || !logNote.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
              >
                log it
              </button>
            </div>
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
                    className="text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0 mt-0.5"
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
