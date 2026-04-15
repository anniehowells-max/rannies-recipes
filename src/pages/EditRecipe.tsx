import { useState } from 'react'
import { supabase, type Recipe } from '../lib/supabase'

type Props = {
  recipe: Recipe
  onBack: () => void
  onSaved: (updated: Recipe) => void
}

export default function EditRecipe({ recipe, onBack, onSaved }: Props) {
  const [title, setTitle] = useState(recipe.title)
  const [tags, setTags] = useState((recipe.tags || []).join(', '))
  const [sourceUrl, setSourceUrl] = useState(recipe.source_url || '')
  const [ingredients, setIngredients] = useState((recipe.ingredients || []).join('\n'))
  const [steps, setSteps] = useState((recipe.steps || []).join('\n'))
  const [notes, setNotes] = useState(recipe.notes || '')
  const [photoUrl, setPhotoUrl] = useState(recipe.photo_url || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('recipe name is required'); return }
    setSaving(true)
    setError('')

    const updates = {
      title: title.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      source_url: sourceUrl.trim() || null,
      ingredients: ingredients.split('\n').map(s => s.trim()).filter(Boolean),
      steps: steps.split('\n').map(s => s.trim()).filter(Boolean),
      notes: notes.trim() || null,
      photo_url: photoUrl.trim() || null,
    }

    const { data, error: err } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', recipe.id)
      .select()
      .single()

    if (err || !data) {
      setError('something went wrong — try again')
      setSaving(false)
    } else {
      onSaved(data)
    }
  }

  const labelClass = "text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1 block"
  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:border-amber-600 transition-colors text-sm"

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={onBack} className="text-stone-400 hover:text-stone-600 text-sm mb-6 flex items-center gap-1 transition-colors">
          ← back to recipe
        </button>

        <h1 className="font-serif text-3xl font-medium mb-8">edit recipe</h1>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div>
            <label className={labelClass}>recipe name *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Mum's Bolognese" className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>tags</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="italian, pasta, quick" className={inputClass} />
              <p className="text-xs text-stone-400 mt-1">comma separated</p>
            </div>
            <div>
              <label className={labelClass}>source URL</label>
              <input type="text" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>ingredients</label>
            <textarea
              value={ingredients}
              onChange={e => setIngredients(e.target.value)}
              placeholder={"200g spaghetti\n50g Pecorino Romano\n2 tsp black pepper"}
              rows={6}
              className={inputClass}
            />
            <p className="text-xs text-stone-400 mt-1">one ingredient per line</p>
          </div>

          <div>
            <label className={labelClass}>method</label>
            <textarea
              value={steps}
              onChange={e => setSteps(e.target.value)}
              placeholder={"Cook pasta in salted water\nToast the pepper\nCombine and toss"}
              rows={6}
              className={inputClass}
            />
            <p className="text-xs text-stone-400 mt-1">one step per line</p>
          </div>

          <div>
            <label className={labelClass}>notes / tips</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="anything worth remembering..."
              rows={3}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>photo URL</label>
            <input type="text" value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="paste an image link" className={inputClass} />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              {saving ? 'saving...' : 'save changes'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 border border-stone-200 hover:border-stone-300 text-stone-500 rounded-lg text-sm transition-colors"
            >
              cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
