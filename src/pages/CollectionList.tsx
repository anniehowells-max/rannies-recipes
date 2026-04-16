import { useEffect, useState } from 'react'
import { supabase, type Collection } from '../lib/supabase'

type Props = {
  onSelect: (collection: Collection) => void
}

export default function CollectionList({ onSelect }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setCollections(data)

    const { data: links } = await supabase.from('collection_recipes').select('collection_id')
    if (links) {
      const c: Record<string, number> = {}
      links.forEach(l => { c[l.collection_id] = (c[l.collection_id] || 0) + 1 })
      setCounts(c)
    }
    setLoading(false)
  }

  async function createCollection() {
    if (!newName.trim()) return
    setCreating(true)
    const { data } = await supabase
      .from('collections')
      .insert({ name: newName.trim() })
      .select()
      .single()
    if (data) {
      setCollections(prev => [data, ...prev])
      setNewName('')
    }
    setCreating(false)
  }

  async function deleteCollection(id: string) {
    if (!confirm("Delete this collection? Recipes won't be deleted.")) return
    await supabase.from('collections').delete().eq('id', id)
    setCollections(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="min-h-screen bg-white pb-32">

      <div className="border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <h1 className="font-serif text-4xl font-medium tracking-tight">
            <span className="italic">Collections</span>
          </h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Create new */}
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createCollection()}
            placeholder="new collection name..."
            className="flex-1 py-2.5 border-b border-stone-200 bg-transparent text-stone-800 placeholder-stone-300 focus:outline-none focus:border-stone-500 transition-colors text-base"
          />
          <button
            onClick={createCollection}
            disabled={creating || !newName.trim()}
            className="font-ui text-xs tracking-wider uppercase px-4 py-2.5 bg-black hover:bg-stone-800 text-white rounded-lg transition-colors"
          >
            create
          </button>
        </div>

        {loading ? (
          <p className="text-stone-300 text-sm">loading...</p>
        ) : collections.length === 0 ? (
          <p className="text-stone-300 text-sm italic">no collections yet — create your first one above</p>
        ) : (
          <div className="flex flex-col divide-y divide-stone-100">
            {collections.map(col => (
              <div key={col.id} className="flex items-center gap-4 py-4">
                <button
                  className="flex-1 text-left group"
                  onClick={() => onSelect(col)}
                >
                  <p className="font-serif text-lg font-medium text-stone-900 group-hover:text-stone-500 transition-colors">{col.name}</p>
                  <p className="font-ui text-xs text-stone-400 tracking-wide mt-0.5">
                    {counts[col.id] ?? 0} {(counts[col.id] ?? 0) === 1 ? 'recipe' : 'recipes'}
                  </p>
                </button>
                <button
                  onClick={() => deleteCollection(col.id)}
                  className="font-ui text-xs tracking-wider uppercase px-3 py-1.5 bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-500 rounded-lg transition-colors flex-shrink-0"
                >
                  delete
                </button>
                <button
                  onClick={() => onSelect(col)}
                  className="text-stone-300 hover:text-stone-600 transition-colors flex-shrink-0"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
