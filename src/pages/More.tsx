import { useState } from 'react'
import JSZip from 'jszip'
import { supabase } from '../lib/supabase'

async function gunzip(data: Uint8Array): Promise<string> {
  const ds = new DecompressionStream('gzip')
  const writer = ds.writable.getWriter()
  writer.write(data as BufferSource)
  writer.close()
  const chunks: Uint8Array[] = []
  const reader = ds.readable.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length }
  return new TextDecoder().decode(merged)
}

const OUR_FIELDS: { key: string; label: string; required?: true }[] = [
  { key: 'title',          label: 'title',              required: true },
  { key: 'ingredients',    label: 'ingredients' },
  { key: 'steps',          label: 'method / steps' },
  { key: 'to_serve',       label: 'to serve' },
  { key: 'notes',          label: 'notes' },
  { key: 'tags',           label: 'tags' },
  { key: 'source_url',     label: 'source URL' },
  { key: 'portions',       label: 'portions' },
  { key: 'prep_time_mins', label: 'prep time (mins)' },
  { key: 'cook_time_mins', label: 'cook time (mins)' },
]

const ARRAY_FIELDS  = new Set(['ingredients', 'steps', 'tags', 'to_serve'])
const NUMBER_FIELDS = new Set(['portions', 'prep_time_mins', 'cook_time_mins'])

function autoMap(keys: string[]): Record<string, string> {
  const n = (s: string) => s.toLowerCase().replace(/[-_\s]/g, '')
  const rules: [string, string[]][] = [
    ['title',          ['title', 'name', 'recipename', 'recipe']],
    ['ingredients',    ['ingredients', 'ingredient']],
    ['steps',          ['steps', 'step', 'instructions', 'instruction', 'method', 'methods', 'directions', 'direction']],
    ['notes',          ['notes', 'note', 'description', 'desc', 'tips', 'tip']],
    ['tags',           ['tags', 'tag', 'categories', 'category', 'cuisine']],
    ['source_url',     ['sourceurl', 'source', 'url', 'link', 'originalurl', 'recipeurl']],
    ['to_serve',       ['toserve', 'serving', 'toservewith', 'sides']],
    ['portions',       ['portions', 'servings', 'serves', 'yield', 'yields']],
    ['prep_time_mins', ['preptimemins', 'preptime', 'prep', 'preparationtime', 'preptimeminutes']],
    ['cook_time_mins', ['cooktimemins', 'cooktime', 'cook', 'cookingtime', 'cooktimeminutes']],
  ]
  const map: Record<string, string> = {}
  for (const [field, candidates] of rules) {
    for (const key of keys) {
      if (candidates.includes(n(key))) { map[field] = key; break }
    }
  }
  return map
}

function coerce(value: unknown, fieldKey: string): unknown {
  if (value == null) return null
  if (ARRAY_FIELDS.has(fieldKey)) {
    if (Array.isArray(value)) return (value as unknown[]).map(String).filter(Boolean)
    if (typeof value === 'string') return value.split('\n').map(s => s.trim()).filter(Boolean)
    return null
  }
  if (NUMBER_FIELDS.has(fieldKey)) {
    const n = parseInt(String(value))
    return isNaN(n) ? null : n
  }
  return String(value)
}

type ImportResult = { ok: boolean; message: string }

export default function More() {
  // ── Export ──────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)

  // ── ZIP import ──────────────────────────────────────────
  const [zipImporting, setZipImporting] = useState(false)
  const [zipResult, setZipResult] = useState<ImportResult | null>(null)

  // ── JSON import ─────────────────────────────────────────
  const [jsonData, setJsonData] = useState<Record<string, unknown>[] | null>(null)
  const [sourceKeys, setSourceKeys] = useState<string[]>([])
  const [fieldMap, setFieldMap] = useState<Record<string, string>>({})
  const [jsonImporting, setJsonImporting] = useState(false)
  const [jsonResult, setJsonResult] = useState<ImportResult | null>(null)

  // ── Export handler ──────────────────────────────────────
  async function handleExport() {
    setExporting(true)
    const { data } = await supabase.from('recipes').select('*').order('title')
    if (!data) { setExporting(false); return }

    const zip = new JSZip()
    const folder = zip.folder('recipes')!
    folder.file('recipes.json', JSON.stringify(data, null, 2))

    const fmt = (mins: number) => {
      const h = Math.floor(mins / 60), m = mins % 60
      return h === 0 ? `${m} mins` : m === 0 ? `${h} hrs` : `${h} hrs ${m} mins`
    }
    for (const r of data) {
      const lines: string[] = [r.title, '='.repeat(r.title.length), '']
      if (r.portions)       lines.push(`Portions: ${r.portions}`)
      if (r.prep_time_mins) lines.push(`Prep: ${fmt(r.prep_time_mins)}`)
      if (r.cook_time_mins) lines.push(`Cook: ${fmt(r.cook_time_mins)}`)
      if (r.tags?.length)   lines.push(`Tags: ${r.tags.join(', ')}`)
      if (r.source_url)     lines.push(`Source: ${r.source_url}`)
      if (r.ingredients?.length) { lines.push('', 'INGREDIENTS', '-----------'); r.ingredients.forEach((i: string) => lines.push(i)) }
      if (r.to_serve?.length)    { lines.push('', 'TO SERVE', '--------'); r.to_serve.forEach((i: string) => lines.push(i)) }
      if (r.steps?.length)       { lines.push('', 'METHOD', '------'); r.steps.forEach((s: string, i: number) => lines.push(`${i + 1}. ${s}`)) }
      if (r.notes)               { lines.push('', 'NOTES', '-----', r.notes) }
      folder.file(r.title.replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-+/g, '-') + '.txt', lines.join('\n'))
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'my-recipes.zip'; a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  // ── ZIP import handler ──────────────────────────────────
  async function handleZipImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setZipImporting(true)
    setZipResult(null)
    try {
      // Paprika export format (.paprikarecipes is a ZIP of gzipped JSON files)
      if (file.name.endsWith('.paprikarecipes')) {
        const zip = await JSZip.loadAsync(file)
        const recipeFiles = zip.file(/\.paprikarecipe$/)
        if (recipeFiles.length === 0) throw new Error('No .paprikarecipe files found in the Paprika export.')
        const toInsert: Record<string, unknown>[] = []
        for (const recipeFile of recipeFiles) {
          try {
            const compressed = await recipeFile.async('uint8array')
            const text = await gunzip(compressed)
            const raw = JSON.parse(text)
            const recipe: Record<string, unknown> = {}
            if (raw.name) recipe.title = String(raw.name)
            if (!recipe.title) continue
            if (typeof raw.ingredients === 'string')
              recipe.ingredients = (raw.ingredients as string).split('\n').map((s: string) => s.trim()).filter(Boolean)
            if (typeof raw.directions === 'string')
              recipe.steps = (raw.directions as string).split('\n').map((s: string) => s.trim()).filter(Boolean)
            if (raw.notes) recipe.notes = String(raw.notes)
            if (Array.isArray(raw.tags)) recipe.tags = (raw.tags as unknown[]).map(String).filter(Boolean)
            if (raw.source) recipe.source_url = String(raw.source)
            toInsert.push(recipe)
          } catch {
            // skip malformed files
          }
        }
        if (toInsert.length === 0) throw new Error('No valid recipes found in the Paprika export.')
        const { error } = await supabase.from('recipes').insert(toInsert)
        if (error) throw new Error(error.message)
        setZipResult({ ok: true, message: `Imported ${toInsert.length} recipe${toInsert.length === 1 ? '' : 's'} from Paprika successfully.` })
        setZipImporting(false)
        e.target.value = ''
        return
      }

      const zip = await JSZip.loadAsync(file)

      // Our own backup format
      const jsonFile = zip.file('recipes/recipes.json') ?? zip.file('recipes.json')
      if (jsonFile) {
        const recipes = JSON.parse(await jsonFile.async('text'))
        if (!Array.isArray(recipes)) throw new Error('recipes.json must contain an array of recipes.')
        const toInsert = recipes.map(({ id: _id, created_at: _c, updated_at: _u, photo_url: _p, ...rest }: Record<string, unknown>) => rest)
        const { error } = await supabase.from('recipes').insert(toInsert)
        if (error) throw new Error(error.message)
        setZipResult({ ok: true, message: `Imported ${toInsert.length} recipe${toInsert.length === 1 ? '' : 's'} successfully.` })
        setZipImporting(false)
        e.target.value = ''
        return
      }

      // Crouton export format (.crumb files are JSON, possibly gzip-compressed)
      const crumbFiles = zip.file(/\.crumb$/i)
      if (crumbFiles.length > 0) {
        const toInsert: Record<string, unknown>[] = []
        const parseErrors: string[] = []
        for (const crumbFile of crumbFiles) {
          try {
            const text = await crumbFile.async('text')
            const raw = JSON.parse(text)
            const recipe: Record<string, unknown> = {}
            if (raw.name) recipe.title = String(raw.name)
            if (!recipe.title) continue
            console.log('ingredient sample:', JSON.stringify(raw.ingredients?.[0]))
            if (Array.isArray(raw.ingredients))
              recipe.ingredients = raw.ingredients
                .map((i: Record<string, unknown>) =>
                  [i.quantity, i.unit, i.name].filter(Boolean).map(String).join(' ').trim()
                )
                .filter(Boolean)
            if (Array.isArray(raw.steps))
              recipe.steps = raw.steps
                .map((s: Record<string, unknown>) => String(s.step ?? '').trim())
                .filter(Boolean)
            if (raw.notes) recipe.notes = String(raw.notes)
            if (Array.isArray(raw.tags)) recipe.tags = raw.tags.map(String).filter(Boolean)
            if (raw.source) recipe.source_url = String(raw.source)
            if (raw.serves) recipe.portions = raw.serves
            if (Array.isArray(raw.images) && raw.images.length > 0) {
              const base64 = String(raw.images[0]).replace(/^data:image\/\w+;base64,/, '')
              const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
              const filename = `${Date.now()}.jpg`
              const { data: uploadData } = await supabase.storage
                .from('recipe-photos')
                .upload(filename, bytes, { contentType: 'image/jpeg' })
              if (uploadData) {
                const { data: urlData } = supabase.storage
                  .from('recipe-photos')
                  .getPublicUrl(uploadData.path)
                recipe.photo_url = urlData.publicUrl
              }
            }
            toInsert.push(recipe)
          } catch (err) {
            parseErrors.push(`${crumbFile.name}: ${(err as Error).message}`)
          }
        }
        if (toInsert.length === 0) {
          const detail = parseErrors.length > 0 ? ` Errors: ${parseErrors.join('; ')}` : ''
          throw new Error(`Found ${crumbFiles.length} .crumb file${crumbFiles.length === 1 ? '' : 's'} but could not parse any.${detail}`)
        }
        const { error } = await supabase.from('recipes').insert(toInsert)
        if (error) throw new Error(error.message)
        setZipResult({ ok: true, message: `Imported ${toInsert.length} recipe${toInsert.length === 1 ? '' : 's'} from Crouton successfully.` })
        setZipImporting(false)
        e.target.value = ''
        return
      }

      // Show all top-level file names to help diagnose unrecognised ZIPs
      const fileList = Object.keys(zip.files).slice(0, 10).join(', ')
      throw new Error(`Unrecognised ZIP format. Files found: ${fileList || '(none)'}`)
    } catch (err) {
      setZipResult({ ok: false, message: (err as Error).message })
    }
    setZipImporting(false)
    e.target.value = ''
  }

  // ── Mela import handler ─────────────────────────────────
  async function handleMelaImport(file: File) {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as Record<string, unknown>
      let arr: Record<string, unknown>[]
      if (Array.isArray(parsed)) arr = parsed
      else if (Array.isArray(parsed.recipes)) arr = parsed.recipes as Record<string, unknown>[]
      else arr = [parsed]

      const toInsert = arr
        .map(raw => {
          const recipe: Record<string, unknown> = {}
          if (raw.title) recipe.title = String(raw.title)
          if (!recipe.title) return null
          if (typeof raw.ingredients === 'string')
            recipe.ingredients = (raw.ingredients as string).split('\n').map(s => s.trim()).filter(Boolean)
          if (typeof raw.instructions === 'string')
            recipe.steps = (raw.instructions as string).split('\n').map(s => s.trim()).filter(Boolean)
          if (raw.notes) recipe.notes = String(raw.notes)
          if (Array.isArray(raw.tags)) recipe.tags = (raw.tags as unknown[]).map(String).filter(Boolean)
          if (raw.link) recipe.source_url = String(raw.link)
          return recipe
        })
        .filter((r): r is Record<string, unknown> => r !== null && Boolean(r.title))

      if (toInsert.length === 0) throw new Error('No valid recipes found in the Mela export.')
      const { error } = await supabase.from('recipes').insert(toInsert)
      if (error) throw new Error(error.message)
      setJsonResult({ ok: true, message: `Imported ${toInsert.length} recipe${toInsert.length === 1 ? '' : 's'} from Mela successfully.` })
    } catch (err) {
      setJsonResult({ ok: false, message: (err as Error).message })
    }
  }

  // ── JSON file picker ────────────────────────────────────
  function handleJsonFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setJsonResult(null)

    if (file.name.endsWith('.mela') || file.name.endsWith('.melarecipes')) {
      handleMelaImport(file)
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        const arr: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed]
        const keys = Array.from(new Set(arr.flatMap(r => Object.keys(r))))
        setSourceKeys(keys)
        setJsonData(arr)
        setFieldMap(autoMap(keys))
      } catch {
        setJsonResult({ ok: false, message: 'Could not parse file — make sure it is valid JSON.' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── JSON import handler ─────────────────────────────────
  async function handleJsonImport() {
    if (!jsonData) return
    setJsonImporting(true)
    setJsonResult(null)
    try {
      const toInsert = jsonData
        .map(raw => {
          const recipe: Record<string, unknown> = {}
          for (const [ourField, sourceField] of Object.entries(fieldMap)) {
            if (!sourceField) continue
            const val = coerce(raw[sourceField], ourField)
            if (val != null) recipe[ourField] = val
          }
          return recipe
        })
        .filter(r => r.title)

      if (toInsert.length === 0) throw new Error('No valid recipes found — make sure "title" is mapped to a field that has a value.')
      const { error } = await supabase.from('recipes').insert(toInsert)
      if (error) throw new Error(error.message)
      setJsonResult({ ok: true, message: `Imported ${toInsert.length} recipe${toInsert.length === 1 ? '' : 's'} successfully.` })
      setJsonData(null)
      setSourceKeys([])
    } catch (err) {
      setJsonResult({ ok: false, message: (err as Error).message })
    }
    setJsonImporting(false)
  }

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white pb-32">

      <div className="border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <h1 className="font-serif text-4xl font-medium tracking-tight">
            <span className="italic">More</span>
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto">

        {/* Export */}
        <div className="px-6 py-8 border-b-2 border-stone-200">
          <p className="font-ui text-xs tracking-[0.2em] uppercase text-stone-500 mb-3">export</p>
          <p className="text-sm text-stone-500 leading-relaxed mb-5">
            Download all your recipes as a .zip file. Includes a formatted text file for each recipe and a full JSON export.
          </p>
          <button onClick={handleExport} disabled={exporting}
            className="font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-stone-900 hover:bg-black disabled:opacity-40 text-white rounded-lg transition-colors">
            {exporting ? 'exporting...' : 'export all recipes'}
          </button>
        </div>

        {/* Import from ZIP backup */}
        <div className="px-6 py-8 border-b-2 border-stone-200">
          <p className="font-ui text-xs tracking-[0.2em] uppercase text-stone-500 mb-3">import from backup</p>
          <p className="text-sm text-stone-500 leading-relaxed mb-5">
            Restore from a backup exported from this app, or import from Crouton (.zip) or Paprika (.paprikarecipes).
          </p>
          <label className={`inline-block font-ui text-xs tracking-wider uppercase px-4 py-2.5 rounded-lg transition-colors cursor-pointer text-white ${zipImporting ? 'bg-stone-900 opacity-40 pointer-events-none' : 'bg-stone-900 hover:bg-black'}`}>
            {zipImporting ? 'importing...' : 'choose file'}
            <input type="file" accept=".zip,.paprikarecipes" onChange={handleZipImport} className="sr-only" disabled={zipImporting} />
          </label>
          {zipResult && (
            <p className={`mt-4 text-sm ${zipResult.ok ? 'text-stone-600' : 'text-red-400'}`}>
              {zipResult.ok ? '✓ ' : ''}{zipResult.message}
            </p>
          )}
        </div>

        {/* Import from another app's JSON */}
        <div className="px-6 py-8 border-b-2 border-stone-200">
          <p className="font-ui text-xs tracking-[0.2em] uppercase text-stone-500 mb-3">import from another app</p>
          <p className="text-sm text-stone-500 leading-relaxed mb-5">
            Import from Mela (.mela or .melarecipes) — imported automatically. Or upload any other app's JSON file to map fields manually before importing.
          </p>

          {!jsonData ? (
            <>
              <label className="inline-block font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-stone-900 hover:bg-black text-white rounded-lg transition-colors cursor-pointer">
                choose file
                <input type="file" accept=".json,.mela,.melarecipes" onChange={handleJsonFile} className="sr-only" />
              </label>
              {jsonResult && !jsonResult.ok && (
                <p className="mt-4 text-sm text-red-400">{jsonResult.message}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-stone-500 mb-6">
                {jsonData.length} recipe{jsonData.length !== 1 ? 's' : ''} found. Map their fields to ours below.
              </p>

              <div className="border border-stone-200 rounded-xl overflow-hidden mb-6">
                <div className="grid grid-cols-2 bg-stone-50 px-4 py-2.5 border-b border-stone-200">
                  <span className="font-ui text-[10px] tracking-wider uppercase text-stone-400">our field</span>
                  <span className="font-ui text-[10px] tracking-wider uppercase text-stone-400">their field</span>
                </div>
                {OUR_FIELDS.map(({ key, label, required }) => (
                  <div key={key} className="grid grid-cols-2 gap-4 px-4 py-3 border-b border-stone-100 last:border-b-0 items-center">
                    <span className="text-sm text-stone-700">
                      {label}
                      {required && <span className="text-red-400 ml-0.5">*</span>}
                    </span>
                    <select
                      value={fieldMap[key] ?? ''}
                      onChange={e => setFieldMap(prev => ({ ...prev, [key]: e.target.value }))}
                      className="text-sm text-stone-700 border border-stone-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-stone-900 transition-colors"
                    >
                      <option value="">— skip —</option>
                      {sourceKeys.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleJsonImport}
                  disabled={jsonImporting || !fieldMap['title']}
                  className="font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-stone-900 hover:bg-black disabled:opacity-40 text-white rounded-lg transition-colors"
                >
                  {jsonImporting ? 'importing...' : `import ${jsonData.length} recipe${jsonData.length !== 1 ? 's' : ''}`}
                </button>
                <button
                  onClick={() => { setJsonData(null); setSourceKeys([]); setFieldMap({}); setJsonResult(null) }}
                  className="font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-lg transition-colors"
                >
                  cancel
                </button>
              </div>

              {jsonResult && (
                <p className={`mt-4 text-sm ${jsonResult.ok ? 'text-stone-600' : 'text-red-400'}`}>
                  {jsonResult.ok ? '✓ ' : ''}{jsonResult.message}
                </p>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  )
}
