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

  function formatTime(mins: number): string {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  function formatDate(str: string) {
    return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-white">

      {/* Top nav */}
      <div className="border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
            ← back
          </button>
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-4 py-2.5 bg-stone-900 hover:bg-black text-white text-sm rounded-lg transition-colors">edit</button>
            <button onClick={handleDelete} className="px-4 py-2.5 bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-600 text-sm rounded-lg transition-colors">delete</button>
          </div>
        </div>
      </div>

      {/* Hero image */}
      {recipe.photo_url ? (
        <img src={recipe.photo_url} alt={recipe.title} className="w-full h-72 object-cover" />
      ) : (
        <div className="w-full h-48 bg-stone-50 flex items-center justify-center text-6xl">🍽️</div>
      )}

      <div className="max-w-2xl mx-auto">

        {/* Title block */}
        <div className="py-8 px-6 border-b-2 border-stone-200">
          <h1 className="font-serif text-5xl font-medium tracking-tight leading-tight mb-4">{recipe.title}</h1>

          {/* Meta row: time + stars */}
          <div className="flex items-center gap-6 mb-4">
            {(recipe.prep_time_mins || recipe.cook_time_mins) && (
              <div className="flex items-center gap-4">
                {recipe.prep_time_mins && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-stone-400">prep</span>
                    <span className="text-sm font-semibold text-stone-700">{formatTime(recipe.prep_time_mins)}</span>
                  </div>
                )}
                {recipe.prep_time_mins && recipe.cook_time_mins && <span className="text-stone-200">|</span>}
                {recipe.cook_time_mins && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-stone-400">cook</span>
                    <span className="text-sm font-semibold text-stone-700">{formatTime(recipe.cook_time_mins)}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(star => {
                const filled = star <= (hoverRating ?? rating ?? 0)
                return (
                  <button key={star} type="button" onClick={() => handleRate(star)}
                    onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(null)}
                    className="transition-transform hover:scale-110">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" strokeLinejoin="round" strokeLinecap="round">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                        fill={filled ? '#1c1917' : 'none'} stroke={filled ? '#1c1917' : '#d6d3d1'} strokeWidth="1.5" />
                    </svg>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Tags */}
          {(recipe.tags || []).length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {(recipe.tags || []).map(tag => (
                <span key={tag} className="text-xs bg-stone-50 border border-stone-900 text-stone-900 px-3 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          )}

          {recipe.source_url && (
            <a href={recipe.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs tracking-wide text-stone-900 hover:text-stone-900 transition-colors">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="#1c1917" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13L13 3M13 3H6M13 3V10" />
              </svg>
              view original source
            </a>
          )}
        </div>

        {/* Ingredients */}
        <div className="py-8 px-6 border-b-2 border-stone-200">
          <div className="flex items-center justify-between mb-5">
            <p className="text-xs tracking-[0.2em] uppercase text-stone-500">ingredients</p>
            {recipe.portions && (
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-stone-200 rounded-full px-1 py-1 gap-1">
                  <button onClick={() => setPortions(p => Math.max(1, p - 1))}
                    className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors text-base">−</button>
                  <span className="text-sm font-medium w-6 text-center">{portions}</span>
                  <button onClick={() => setPortions(p => p + 1)}
                    className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors text-base">+</button>
                </div>
                <span className="text-xs text-stone-400">portions</span>
              </div>
            )}
          </div>
          <ul className="space-y-2.5">
            {(recipe.ingredients || []).map((ing, i) => (
              <li key={i} className="flex items-start gap-3 text-base text-stone-700">
                <span className="w-1 h-1 rounded-full bg-stone-800 flex-shrink-0 mt-2.5" />
                {scaleIngredient(ing)}
              </li>
            ))}
          </ul>
        </div>

        {/* Method */}
        <div className="py-8 px-6 border-b-2 border-stone-200">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-500 mb-5">method</p>
          <ol className="space-y-5">
            {(recipe.steps || []).map((step, i) => (
              <li key={i} className="flex items-start gap-4 text-base text-stone-700">
                <span className="text-[10px] tracking-widest text-stone-300 font-semibold flex-shrink-0 mt-1.5 w-4">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Notes */}
        {recipe.notes && (
          <div className="py-8 px-6 border-b-2 border-stone-200">
            <p className="text-xs tracking-[0.2em] uppercase text-stone-500 mb-3">notes</p>
            <p className="text-base text-stone-500 italic leading-relaxed">{recipe.notes}</p>
          </div>
        )}

        {/* Cooking log */}
        <div className="py-8 pb-16 px-6">
          <p className="text-xs tracking-[0.2em] uppercase text-stone-500 mb-5">cooking log</p>

          <div className="flex flex-col gap-2 mb-6">
            <div className="flex gap-2">
              <input type="text" value={logNote} onChange={e => setLogNote(e.target.value)}
                placeholder="add a note about tonight's cook..."
                className="flex-1 px-3 py-3 text-base rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-900 transition-colors" />
              <input type="text" value={logAuthor} onChange={e => setLogAuthor(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addLogEntry() }}
                placeholder="who cooked?"
                className="w-32 px-3 py-3 text-base rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-900 transition-colors" />
            </div>
            <div className="flex items-center gap-3 self-end">
              {logError && <p className="text-red-400 text-xs">{logError}</p>}
              <button onClick={addLogEntry} disabled={saving || !logNote.trim()}
                className="px-5 py-3 bg-stone-900 hover:bg-black disabled:opacity-40 text-white text-sm rounded-lg transition-colors">
                log it
              </button>
            </div>
          </div>

          {log.length === 0 ? (
            <p className="text-stone-300 text-sm italic">no cooks logged yet</p>
          ) : (
            <div>
              {log.map((entry, i) => (
                <div key={entry.id} className={`flex items-start gap-4 py-4 ${i < log.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <div className="flex-1">
                    <p className="text-xs text-stone-400 mb-1">
                      {formatDate(entry.cooked_at)}{entry.cooked_by && <span className="text-stone-300"> · {entry.cooked_by}</span>}
                    </p>
                    {entry.note && <p className="text-base text-stone-600 italic">{entry.note}</p>}
                  </div>
                  <button onClick={() => deleteLogEntry(entry.id)}
                    className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
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
