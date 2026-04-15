import { useState } from 'react'
import { supabase, type Recipe } from '../lib/supabase'

type Props = {
  recipe: Recipe
  onBack: () => void
  onSaved: (updated: Recipe) => void
}

function TimeInput({ label, hours, mins, onHoursChange, onMinsChange }: {
  label: string
  hours: string
  mins: string
  onHoursChange: (v: string) => void
  onMinsChange: (v: string) => void
}) {
  const inputClass = "w-14 px-2 py-2.5 rounded-lg border border-stone-200 bg-white text-stone-800 text-center focus:outline-none focus:border-green-600 transition-colors text-sm"
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        <input
          type="number" min="0" max="23" value={hours}
          onChange={e => onHoursChange(e.target.value)}
          placeholder="0" className={inputClass}
        />
        <span className="text-stone-400 text-sm">h</span>
        <input
          type="number" min="0" max="59" value={mins}
          onChange={e => onMinsChange(e.target.value)}
          placeholder="0" className={inputClass}
        />
        <span className="text-stone-400 text-sm">m</span>
      </div>
    </div>
  )
}

function minsToHoursAndMins(total: number | null): [string, string] {
  if (!total) return ['', '']
  return [String(Math.floor(total / 60)), String(total % 60)]
}

export default function EditRecipe({ recipe, onBack, onSaved }: Props) {
  const [title, setTitle] = useState(recipe.title)
  const [portions, setPortions] = useState(recipe.portions ? String(recipe.portions) : '')
  const [prepHours, setPrepHours] = useState(minsToHoursAndMins(recipe.prep_time_mins)[0])
  const [prepMins, setPrepMins] = useState(minsToHoursAndMins(recipe.prep_time_mins)[1])
  const [cookHours, setCookHours] = useState(minsToHoursAndMins(recipe.cook_time_mins)[0])
  const [cookMins, setCookMins] = useState(minsToHoursAndMins(recipe.cook_time_mins)[1])
  const [tags, setTags] = useState((recipe.tags || []).join(', '))
  const [sourceUrl, setSourceUrl] = useState(recipe.source_url || '')
  const [ingredients, setIngredients] = useState((recipe.ingredients || []).join('\n'))
  const [steps, setSteps] = useState((recipe.steps || []).join('\n'))
  const [notes, setNotes] = useState(recipe.notes || '')
  const [photoUrl, setPhotoUrl] = useState(recipe.photo_url || '')
  const [photoPreview, setPhotoPreview] = useState(recipe.photo_url || '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
    setUploading(true)
    setError('')
    const ext = file.name.split('.').pop()
    const path = `${crypto.randomUUID()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('recipe-photos')
      .upload(path, file)
    if (uploadErr) {
      setError('photo upload failed — try again')
      setPhotoPreview(recipe.photo_url || '')
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('recipe-photos').getPublicUrl(path)
    setPhotoUrl(data.publicUrl)
    setUploading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('recipe name is required'); return }
    setSaving(true)
    setError('')

    const toMins = (h: string, m: string) => {
      const total = (parseInt(h) || 0) * 60 + (parseInt(m) || 0)
      return total > 0 ? total : null
    }

    const updates = {
      title: title.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      source_url: sourceUrl.trim() || null,
      ingredients: ingredients.split('\n').map(s => s.trim()).filter(Boolean),
      steps: steps.split('\n').map(s => s.trim()).filter(Boolean),
      notes: notes.trim() || null,
      photo_url: photoUrl.trim() || null,
      portions: portions ? parseInt(portions) : null,
      prep_time_mins: toMins(prepHours, prepMins),
      cook_time_mins: toMins(cookHours, cookMins),
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
  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-stone-200 bg-white text-stone-800 placeholder-stone-300 focus:outline-none focus:border-green-600 transition-colors text-sm"

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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>portions</label>
              <input type="number" min="1" value={portions} onChange={e => setPortions(e.target.value)} placeholder="e.g. 4" className={inputClass} />
            </div>
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

          <div className="grid grid-cols-2 gap-4">
            <TimeInput label="prep time" hours={prepHours} mins={prepMins} onHoursChange={setPrepHours} onMinsChange={setPrepMins} />
            <TimeInput label="cook time" hours={cookHours} mins={cookMins} onHoursChange={setCookHours} onMinsChange={setCookMins} />
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
            <label className={labelClass}>photo</label>
            {photoPreview ? (
              <div className="relative mb-2">
                <img src={photoPreview} alt="preview" className="w-full h-48 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(''); setPhotoUrl('') }}
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white text-stone-500 text-xs px-2 py-1 rounded-md transition-colors"
                >
                  remove
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-stone-200 rounded-lg cursor-pointer hover:border-green-400 transition-colors">
                <span className="text-sm text-stone-400">
                  {uploading ? 'uploading...' : 'click to upload a photo'}
                </span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="sr-only" disabled={uploading} />
              </label>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm transition-colors"
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
