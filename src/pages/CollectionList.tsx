import { useEffect, useState } from 'react'
import { supabase, type Collection } from '../lib/supabase'

type IconId = 'folder' | 'heart' | 'star' | 'carrot' | 'bowl' | 'steak' | 'leaf' | 'cake'

const ICONS: { id: IconId; label: string }[] = [
  { id: 'folder', label: 'Folder' },
  { id: 'heart', label: 'Heart' },
  { id: 'star', label: 'Star' },
  { id: 'carrot', label: 'Carrot' },
  { id: 'bowl', label: 'Bowl' },
  { id: 'steak', label: 'Steak' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'cake', label: 'Cake' },
]

function CollectionIcon({ icon, className = 'w-5 h-5' }: { icon: string; className?: string }) {
  if (icon === 'heart') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    )
  }
  if (icon === 'star') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  }
  if (icon === 'carrot') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        {/* Body */}
        <path d="M12 22c-2-4.5-4-9-3.5-13C9 6 10.3 4.5 12 4.5s3 1.5 3.5 4.5C16 13 14 17.5 12 22z" />
        {/* Leaves */}
        <path d="M11.5 5.5C10 3.5 7.5 2.5 9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M12 5C12 3 13 1.5 13.5 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M12.5 5.5C14 3.5 16.5 2.5 15 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    )
  }
  if (icon === 'bowl') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        {/* Steam */}
        <path d="M8.5 8.5C8 7.5 8 6 8.5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M12 8C11.5 6.5 11.5 5 12 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M15.5 8.5C15 7.5 15 6 15.5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* Bowl body */}
        <path d="M4 11h16c0 4.4-3.6 8-8 8s-8-3.6-8-8z"/>
        {/* Rim */}
        <rect x="2" y="10" width="20" height="2" rx="1"/>
      </svg>
    )
  }
  if (icon === 'steak') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        {/* Meat silhouette */}
        <path d="M3 12c0-3 2-5.5 5.5-5.5 1.5 0 2.5.7 3.5.7s2-.7 3.5-.7C18.5 6.5 21 8.5 21 12s-2.5 5.5-6 5.5c-1.5 0-2.5-.7-3.5-.7s-2 .7-3.5.7C5 17.5 3 15 3 12z"/>
        {/* Grill marks */}
        <path d="M9 9l2 5M13 9l2 5" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      </svg>
    )
  }
  if (icon === 'leaf') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        {/* Leaf body */}
        <path d="M12 3c-5 3-7 9-5 15 2-3 4-7 4-11 0 5-1 9-4 13 5-1 9-6 9-12 0-3-2-6-4-5z"/>
      </svg>
    )
  }
  if (icon === 'cake') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        {/* Flame */}
        <path d="M12 2c-1.5 1.5-1 3.5 0 3.5s1.5-2 0-3.5z"/>
        {/* Candle */}
        <rect x="11" y="5.5" width="2" height="2.5" rx="0.3"/>
        {/* Top tier */}
        <rect x="7" y="8" width="10" height="4" rx="0.5"/>
        {/* Bottom tier */}
        <rect x="4" y="12" width="16" height="5" rx="0.5"/>
        {/* Plate */}
        <rect x="2" y="17" width="20" height="2" rx="1"/>
      </svg>
    )
  }
  // Default: folder (filled)
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  )
}

type Props = {
  onSelect: (collection: Collection) => void
}

export default function CollectionList({ onSelect }: Props) {
  const [collections, setCollections] = useState<Collection[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!pickerOpenId) return
    function handleOutsideClick() { setPickerOpenId(null) }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [pickerOpenId])

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

  async function selectIcon(collectionId: string, icon: IconId) {
    setCollections(prev => prev.map(c => c.id === collectionId ? { ...c, icon } : c))
    setPickerOpenId(null)
    await supabase.from('collections').update({ icon }).eq('id', collectionId)
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

                {/* Icon + picker */}
                <div className="relative flex-shrink-0" onMouseDown={e => e.stopPropagation()}>
                  <button
                    onClick={() => setPickerOpenId(pickerOpenId === col.id ? null : col.id)}
                    className="text-black hover:opacity-60 transition-opacity"
                    title="Change icon"
                  >
                    <CollectionIcon icon={col.icon ?? 'folder'} className="w-5 h-5" />
                  </button>

                  {pickerOpenId === col.id && (
                    <div className="absolute left-0 top-8 z-10 flex gap-1 bg-white border border-stone-200 rounded-lg p-1.5 shadow-md">
                      {ICONS.map(ic => (
                        <button
                          key={ic.id}
                          onClick={() => selectIcon(col.id, ic.id)}
                          className={`p-1.5 rounded transition-colors hover:bg-stone-100 ${(col.icon ?? 'folder') === ic.id ? 'bg-stone-100' : ''}`}
                          title={ic.label}
                        >
                          <CollectionIcon icon={ic.id} className="w-4 h-4 text-black" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

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
