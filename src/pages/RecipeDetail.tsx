import { useEffect, useState } from 'react'
import { supabase, type Recipe, type CookEntry, type Collection } from '../lib/supabase'
import { addIngredientsToList } from './GroceryList'

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
  const [addedToGrocery, setAddedToGrocery] = useState(false)
  const [units, setUnits] = useState<'metric' | 'imperial'>(() =>
    (localStorage.getItem('kitchen-units') as 'metric' | 'imperial') || 'metric'
  )
  const [addingLog, setAddingLog] = useState(false)
  const [logDate, setLogDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editAuthor, setEditAuthor] = useState('')
  const [editDate, setEditDate] = useState('')
  const [recipeCollections, setRecipeCollections] = useState<Collection[]>([])
  const [allCollections, setAllCollections] = useState<Collection[]>([])
  const [showCollectionPicker, setShowCollectionPicker] = useState(false)

  useEffect(() => {
    supabase
      .from('cook_log')
      .select('*')
      .eq('recipe_id', recipe.id)
      .order('cooked_at', { ascending: false })
      .then(({ data }) => { if (data) setLog(data) })
  }, [recipe.id])

  useEffect(() => {
    async function loadCollections() {
      const [{ data: links }, { data: all }] = await Promise.all([
        supabase.from('collection_recipes').select('collection_id').eq('recipe_id', recipe.id),
        supabase.from('collections').select('*').order('name'),
      ])
      if (all) setAllCollections(all)
      if (links && all) {
        const ids = new Set(links.map(l => l.collection_id))
        setRecipeCollections(all.filter(c => ids.has(c.id)))
      }
    }
    loadCollections()
  }, [recipe.id])

  async function toggleCollection(col: Collection) {
    const inCollection = recipeCollections.some(c => c.id === col.id)
    if (inCollection) {
      await supabase.from('collection_recipes').delete()
        .eq('collection_id', col.id).eq('recipe_id', recipe.id)
      setRecipeCollections(prev => prev.filter(c => c.id !== col.id))
    } else {
      await supabase.from('collection_recipes').insert({ collection_id: col.id, recipe_id: recipe.id })
      setRecipeCollections(prev => [...prev, col])
    }
  }

  async function addLogEntry() {
    if (!logNote.trim()) return
    setSaving(true)
    setLogError('')
    const { data, error } = await supabase
      .from('cook_log')
      .insert({
        recipe_id: recipe.id,
        note: logNote.trim(),
        cooked_by: logAuthor.trim() || null,
        cooked_at: logDate || undefined,
      })
      .select()
      .single()
    if (error) {
      setLogError('couldn\'t save — ' + error.message)
    } else if (data) {
      setLog(prev => [data, ...prev].sort(
        (a, b) => new Date(b.cooked_at).getTime() - new Date(a.cooked_at).getTime()
      ))
      setLogNote('')
      setLogAuthor('')
      setLogDate('')
      setAddingLog(false)
    }
    setSaving(false)
  }

  async function deleteLogEntry(id: string) {
    if (!confirm('Delete this log entry? This can\'t be undone.')) return
    await supabase.from('cook_log').delete().eq('id', id)
    setLog(prev => prev.filter(e => e.id !== id))
  }

  function startEdit(entry: CookEntry) {
    setEditingId(entry.id)
    setEditNote(entry.note || '')
    setEditAuthor(entry.cooked_by || '')
    setEditDate(entry.cooked_at.slice(0, 10))
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const { data, error } = await supabase
      .from('cook_log')
      .update({ note: editNote.trim() || null, cooked_by: editAuthor.trim() || null, cooked_at: editDate })
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      setLog(prev => prev.map(e => e.id === id ? data : e).sort(
        (a, b) => new Date(b.cooked_at).getTime() - new Date(a.cooked_at).getTime()
      ))
      setEditingId(null)
    }
    setSaving(false)
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

  function convertToImperial(s: string): string {
    const unicodeFracs: Record<string, number> = { '½':0.5,'¼':0.25,'¾':0.75,'⅓':1/3,'⅔':2/3,'⅛':0.125,'⅜':0.375,'⅝':0.625,'⅞':0.875 }
    const uf = '[½¼¾⅓⅔⅛⅜⅝⅞]'
    // Matches: "2 ½", "2 1/2", "1/2", "½", "2.5", "2"
    const numPat = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\s+${uf}|\\d+(?:\\.\\d+)?|\\d+\\/\\d+|${uf})`

    function parseAmt(n: string): number {
      const mixedUni = n.match(/^(\d+)\s+([½¼¾⅓⅔⅛⅜⅝⅞])$/)
      if (mixedUni) return parseInt(mixedUni[1]) + (unicodeFracs[mixedUni[2]] ?? 0)
      const mixedFrac = n.match(/^(\d+)\s+(\d+)\/(\d+)$/)
      if (mixedFrac) return parseInt(mixedFrac[1]) + parseInt(mixedFrac[2]) / parseInt(mixedFrac[3])
      const frac = n.match(/^(\d+)\/(\d+)$/)
      if (frac) return parseInt(frac[1]) / parseInt(frac[2])
      if (unicodeFracs[n]) return unicodeFracs[n]
      return parseFloat(n)
    }

    const re = (unit: string) => new RegExp(`(${numPat})\\s*${unit}\\b`, 'gi')
    return s
      .replace(re('kg'), (_, n) => `${formatAmount(parseAmt(n) * 2.20462)}lbs`)
      .replace(re('g'), (_, n) => {
        const g = parseAmt(n)
        return g >= 454 ? `${formatAmount(g / 453.592)}lbs` : `${formatAmount(g / 28.3495)}oz`
      })
      .replace(re('l'), (_, n) => `${formatAmount(parseAmt(n) * 4.22675)} cups`)
      .replace(re('ml'), (_, n) => {
        const ml = parseAmt(n)
        return ml >= 240 ? `${formatAmount(ml / 236.588)} cups` : `${formatAmount(ml / 29.5735)} fl oz`
      })
      .replace(re('dl'), (_, n) => `${formatAmount(parseAmt(n) * 3.3814)} fl oz`)
      .replace(re('cl'), (_, n) => `${formatAmount(parseAmt(n) * 0.33814)} fl oz`)
  }

  function displayIngredient(ingredient: string): string {
    const scaled = scaleIngredient(ingredient)
    return units === 'imperial' ? convertToImperial(scaled) : scaled
  }

  function formatIngredient(text: string) {
    // Match leading number/fraction and optional unit, e.g. "110g", "2 tbsp", "1/2 tsp", "½ cup"
    const match = text.match(/^(\d+(?:\s+\d+\/\d+|\s*[½¼¾⅓⅔⅛⅜⅝⅞])?|\d+\/\d+|[½¼¾⅓⅔⅛⅜⅝⅞])(\s*(?:kg|g|ml|dl|cl|tbsp|tsp|cups?|fl\s?oz|oz|lbs?|lb|pinch|handful|bunch|slices?|cans?|l(?=[\s,]|$)))?/i)
    if (!match || !match[0]) return <>{text}</>
    const bold = match[0]
    const rest = text.slice(bold.length)
    return <><span className="font-semibold">{bold}</span>{rest}</>
  }

  function toggleUnits() {
    const next = units === 'metric' ? 'imperial' : 'metric'
    setUnits(next)
    localStorage.setItem('kitchen-units', next)
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
    <div className="min-h-screen bg-white pb-32">

      {/* Top nav */}
      <div className="border-b border-stone-100">
        <div className="max-w-2xl md:max-w-none mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <button onClick={onBack} className="font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors">
            ← back
          </button>
          <div className="flex gap-2">
            <button onClick={onEdit} className="font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-stone-900 hover:bg-black text-white rounded-lg transition-colors">edit</button>
            <button onClick={handleDelete} className="font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-600 rounded-lg transition-colors">delete</button>
          </div>
        </div>
      </div>

      {/* Hero: image left, title right on landscape */}
      <div className="lg:flex lg:border-b-2 lg:border-stone-200">

        {/* Image */}
        {recipe.photo_url ? (
          <img src={recipe.photo_url} alt={recipe.title} className="w-full h-72 object-cover lg:w-1/2 lg:h-auto lg:max-h-[480px]" />
        ) : (
          <div className="w-full h-48 bg-stone-50 flex items-center justify-center text-6xl lg:w-1/2">🍽️</div>
        )}

        {/* Title block */}
        <div className="py-8 px-6 border-b-2 border-stone-200 lg:border-b-0 lg:w-1/2 lg:flex lg:flex-col lg:justify-center">
          <h1 className="font-serif text-5xl font-medium tracking-tight leading-tight mb-4">{recipe.title}</h1>

          {/* Meta row: time + stars */}
          <div className="flex items-center gap-6 mb-4">
            {(recipe.prep_time_mins || recipe.cook_time_mins) && (
              <div className="flex items-center gap-4">
                {recipe.prep_time_mins && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-ui text-[10px] tracking-[0.15em] uppercase text-stone-400">prep</span>
                    <span className="font-ui text-sm font-semibold text-stone-700">{formatTime(recipe.prep_time_mins)}</span>
                  </div>
                )}
                {recipe.prep_time_mins && recipe.cook_time_mins && <span className="text-stone-200">|</span>}
                {recipe.cook_time_mins && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-ui text-[10px] tracking-[0.15em] uppercase text-stone-400">cook</span>
                    <span className="font-ui text-sm font-semibold text-stone-700">{formatTime(recipe.cook_time_mins)}</span>
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
                <span key={tag} className="font-ui text-xs bg-stone-50 border border-stone-900 text-stone-900 px-3 py-1 rounded-full">{tag}</span>
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

      </div>{/* end hero */}

      <div className="max-w-2xl md:max-w-none mx-auto">

        {/* Toggles */}
        <div className="px-6 py-4 border-b-2 border-stone-200 flex items-center gap-3 flex-wrap">
          <div className="flex items-center rounded-full border border-stone-200 p-1">
            <button onClick={() => { if (units !== 'metric') toggleUnits() }}
              className={`font-ui text-xs tracking-wider uppercase px-4 py-2 rounded-full transition-colors ${units === 'metric' ? 'bg-stone-900 text-white' : 'text-stone-400'}`}>
              metric
            </button>
            <button onClick={() => { if (units !== 'imperial') toggleUnits() }}
              className={`font-ui text-xs tracking-wider uppercase px-4 py-2 rounded-full transition-colors ${units === 'imperial' ? 'bg-stone-900 text-white' : 'text-stone-400'}`}>
              imperial
            </button>
          </div>
          {recipe.portions && (
            <div className="flex items-center rounded-full border border-stone-200 p-1">
              <button onClick={() => setPortions(p => Math.max(1, p - 1))}
                className="font-ui text-xs tracking-wider px-4 py-2 rounded-full transition-colors text-stone-400 hover:text-stone-600">−</button>
              <span className="font-ui text-xs font-semibold text-stone-700 px-2 text-center whitespace-nowrap">{portions} ppl</span>
              <button onClick={() => setPortions(p => p + 1)}
                className="font-ui text-xs tracking-wider px-4 py-2 rounded-full transition-colors text-stone-400 hover:text-stone-600">+</button>
            </div>
          )}
        </div>

        {/* Ingredients + Method two-column on iPad+ */}
        <div className="md:grid md:grid-cols-2 md:divide-x-2 md:divide-stone-200 border-b-2 border-stone-200">

        {/* Ingredients */}
        <div className="py-8 px-6 border-b-2 border-stone-200 md:border-b-0">
          <div className="flex items-center justify-between mb-5">
            <p className="font-ui text-xs tracking-[0.2em] uppercase text-stone-500">ingredients</p>
            <button
              onClick={() => {
                addIngredientsToList([
                  ...(recipe.ingredients || []).map(scaleIngredient),
                  ...(recipe.to_serve || []).map(scaleIngredient),
                ])
                setAddedToGrocery(true)
                setTimeout(() => setAddedToGrocery(false), 2000)
              }}
              className="font-ui text-xs tracking-wider uppercase px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
            >
              {addedToGrocery ? '✓ added to groceries' : '+ add to groceries'}
            </button>
          </div>
          <ul className="space-y-2.5 mb-5">
            {(recipe.ingredients || []).map((ing, i) => (
              <li key={i} className="flex items-start gap-3 text-base text-stone-700">
                <span className="w-1 h-1 rounded-full bg-stone-800 flex-shrink-0 mt-2.5" />
                {formatIngredient(displayIngredient(ing))}
              </li>
            ))}
          </ul>

          {(recipe.to_serve || []).length > 0 && (
            <>
              <p className="font-ui text-xs tracking-[0.2em] uppercase text-stone-500 mb-3 mt-6">to serve</p>
              <ul className="space-y-2.5">
                {(recipe.to_serve || []).map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-base text-stone-700">
                    <span className="w-1 h-1 rounded-full bg-stone-800 flex-shrink-0 mt-2.5" />
                    {formatIngredient(displayIngredient(item))}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Method */}
        <div className="py-8 px-6">
          <p className="font-ui text-xs tracking-[0.2em] uppercase text-stone-500 mb-5">method</p>
          <ol className="space-y-5">
            {(recipe.steps || []).map((step, i) => (
              <li key={i} className="flex items-start gap-4 text-base text-stone-700">
                <span className="font-ui text-[10px] tracking-widest text-stone-300 font-semibold flex-shrink-0 mt-1.5 w-4">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        </div>{/* end ingredients+method grid */}

        {/* Notes */}
        {recipe.notes && (
          <div className="py-8 px-6 border-b-2 border-stone-200">
            <p className="font-ui text-xs tracking-[0.2em] uppercase text-stone-500 mb-3">notes</p>
            <p className="text-base text-stone-500 italic leading-relaxed">{recipe.notes}</p>
          </div>
        )}

        {/* Nutrition */}
        {(recipe.calories_per_portion || recipe.protein_g || recipe.carbs_g || recipe.fat_g || recipe.fibre_g) && (() => {
          const scale = recipe.portions ? portions / recipe.portions : 1
          const round = (n: number | null) => n != null ? Math.round(n * scale) : null
          const stats = [
            { label: 'calories', value: round(recipe.calories_per_portion), unit: 'kcal' },
            { label: 'protein', value: round(recipe.protein_g), unit: 'g' },
            { label: 'carbs', value: round(recipe.carbs_g), unit: 'g' },
            { label: 'fat', value: round(recipe.fat_g), unit: 'g' },
            { label: 'fibre', value: round(recipe.fibre_g), unit: 'g' },
          ].filter(s => s.value != null)
          return (
            <div className="py-8 px-6 border-b-2 border-stone-200">
              <p className="font-ui text-xs tracking-[0.2em] uppercase text-stone-500 mb-5">
                nutrition per portion{recipe.portions && portions !== recipe.portions ? ` (scaled)` : ''}
              </p>
              <div className="grid grid-cols-5 gap-4">
                {stats.map(({ label, value, unit }) => (
                  <div key={label} className="text-center">
                    <p className="font-ui text-xl font-semibold text-stone-800">{value}<span className="text-xs text-stone-400 ml-0.5">{unit}</span></p>
                    <p className="font-ui text-[10px] tracking-wider uppercase text-stone-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Collections */}
        <div className="py-8 px-6 border-b-2 border-stone-200">
          <div className="flex items-center justify-between mb-4">
            <p className="font-ui text-xs tracking-[0.2em] uppercase text-stone-500">collections</p>
            <button
              onClick={() => setShowCollectionPicker(v => !v)}
              className="font-ui text-xs tracking-wider uppercase px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
            >
              {showCollectionPicker ? 'done' : '+ add to collection'}
            </button>
          </div>

          {showCollectionPicker && (
            <div className="mb-4 border border-stone-200 rounded-xl overflow-hidden">
              {allCollections.length === 0 ? (
                <p className="px-4 py-3 text-sm text-stone-300 italic">no collections yet — create one from the collections page</p>
              ) : (
                allCollections.map(col => {
                  const active = recipeCollections.some(c => c.id === col.id)
                  return (
                    <button
                      key={col.id}
                      onClick={() => toggleCollection(col)}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-3 border-b border-stone-100 last:border-b-0 transition-colors"
                    >
                      <span className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-stone-900 border-stone-900' : 'border-stone-300'}`}>
                        {active && (
                          <svg viewBox="0 0 10 8" className="w-3 h-3">
                            <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </span>
                      {col.name}
                    </button>
                  )
                })
              )}
            </div>
          )}

          {recipeCollections.length === 0 ? (
            <p className="text-stone-300 text-sm italic">not in any collections</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recipeCollections.map(col => (
                <span key={col.id} className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-full px-3 py-1.5">
                  <span className="font-ui text-xs text-stone-700">{col.name}</span>
                  <button
                    onClick={() => toggleCollection(col)}
                    className="text-stone-300 hover:text-stone-600 transition-colors leading-none"
                  >×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Cooking log */}
        <div className="py-8 pb-16 px-6">
          <div className="flex items-center justify-between mb-5">
            <p className="font-ui text-xs tracking-[0.2em] uppercase text-stone-500">cooking log</p>
            {!addingLog && (
              <button onClick={() => setAddingLog(true)}
                className="font-ui text-xs tracking-wider uppercase px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors">
                + add entry
              </button>
            )}
          </div>

          {addingLog && (
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex gap-2">
                <input type="text" value={logNote} onChange={e => setLogNote(e.target.value)}
                  placeholder="add a note about tonight's cook..."
                  className="flex-1 min-w-0 px-3 py-2.5 text-base rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-900 transition-colors" />
                <input type="text" value={logAuthor} onChange={e => setLogAuthor(e.target.value)}
                  placeholder="who cooked?"
                  className="w-28 min-w-0 px-3 py-2.5 text-base rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-900 transition-colors" />
              </div>
              <div className="flex items-center gap-3">
                <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2.5 text-sm rounded-lg border border-stone-200 bg-white text-stone-800 focus:outline-none focus:border-stone-900 transition-colors [color-scheme:light]" />
                {logError && <p className="text-red-400 text-xs">{logError}</p>}
                <button onClick={() => { setAddingLog(false); setLogNote(''); setLogAuthor(''); setLogDate('') }}
                  className="font-ui text-xs tracking-wider uppercase px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg transition-colors flex-shrink-0">
                  cancel
                </button>
                <button onClick={addLogEntry} disabled={saving || !logNote.trim()}
                  className="font-ui text-xs tracking-wider uppercase px-4 py-2 bg-stone-900 hover:bg-black disabled:opacity-40 text-white rounded-lg transition-colors flex-shrink-0">
                  save
                </button>
              </div>
            </div>
          )}

          {log.length === 0 ? (
            <p className="text-stone-300 text-sm italic">no cooks logged yet</p>
          ) : (
            <div>
              {log.map((entry, i) => (
                <div key={entry.id} className={`py-4 ${i < log.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  {editingId === entry.id ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)}
                          placeholder="note..."
                          className="flex-1 min-w-0 px-3 py-2.5 text-base rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-900 transition-colors" />
                        <input type="text" value={editAuthor} onChange={e => setEditAuthor(e.target.value)}
                          placeholder="who cooked?"
                          className="w-28 min-w-0 px-3 py-2.5 text-base rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-stone-900 transition-colors" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                          className="flex-1 min-w-0 px-3 py-2.5 text-sm rounded-lg border border-stone-200 bg-white text-stone-800 focus:outline-none focus:border-stone-900 transition-colors [color-scheme:light]" />
                        <button onClick={() => setEditingId(null)}
                          className="font-ui text-xs tracking-wider uppercase px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg transition-colors flex-shrink-0">
                          cancel
                        </button>
                        <button onClick={() => saveEdit(entry.id)} disabled={saving}
                          className="font-ui text-xs tracking-wider uppercase px-4 py-1.5 bg-stone-900 hover:bg-black disabled:opacity-40 text-white rounded-lg transition-colors flex-shrink-0">
                          save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-stone-400 mb-1">
                          {formatDate(entry.cooked_at)}{entry.cooked_by && <span className="text-stone-300"> · {entry.cooked_by}</span>}
                        </p>
                        {entry.note && <p className="text-base text-stone-600 italic">{entry.note}</p>}
                      </div>
                      <button onClick={() => startEdit(entry)}
                        className="font-ui text-xs tracking-wider uppercase px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg transition-colors flex-shrink-0">
                        edit
                      </button>
                      <button onClick={() => deleteLogEntry(entry.id)}
                        className="font-ui text-xs tracking-wider uppercase px-3 py-1.5 bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-500 rounded-lg transition-colors flex-shrink-0">
                        delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
