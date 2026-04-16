import { useState, useEffect } from 'react'

export type GroceryItem = {
  id: string
  text: string
  checked: boolean
}

export function loadGroceryList(): GroceryItem[] {
  try {
    return JSON.parse(localStorage.getItem('kitchen-grocery-list') || '[]')
  } catch {
    return []
  }
}

export function saveGroceryList(items: GroceryItem[]) {
  localStorage.setItem('kitchen-grocery-list', JSON.stringify(items))
}

export function addIngredientsToList(ingredients: string[]) {
  const current = loadGroceryList()
  const newItems: GroceryItem[] = ingredients.map(text => ({
    id: crypto.randomUUID(),
    text,
    checked: false,
  }))
  saveGroceryList([...current, ...newItems])
}

type Props = {
  onBack: () => void
}

export default function GroceryList({ onBack }: Props) {
  const [items, setItems] = useState<GroceryItem[]>([])

  useEffect(() => {
    setItems(loadGroceryList())
  }, [])

  function toggle(id: string) {
    const updated = items.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    setItems(updated)
    saveGroceryList(updated)
  }

  function deleteItem(id: string) {
    const updated = items.filter(item => item.id !== id)
    setItems(updated)
    saveGroceryList(updated)
  }

  function clearChecked() {
    const updated = items.filter(item => !item.checked)
    setItems(updated)
    saveGroceryList(updated)
  }

  function clearAll() {
    if (!confirm('Clear everything from your grocery list?')) return
    setItems([])
    saveGroceryList([])
  }

  const checkedCount = items.filter(i => i.checked).length
  const unchecked = items.filter(i => !i.checked)
  const checked = items.filter(i => i.checked)

  return (
    <div className="min-h-screen bg-white pb-32">

      {/* Header */}
      <div className="border-b border-stone-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onBack} className="px-4 py-2.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
            ← back
          </button>
          <div className="flex gap-2">
            {checkedCount > 0 && (
              <button onClick={clearChecked} className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm rounded-lg transition-colors">
                clear {checkedCount} ticked
              </button>
            )}
            {items.length > 0 && (
              <button onClick={clearAll} className="px-4 py-2.5 bg-stone-100 hover:bg-red-50 hover:text-red-600 text-stone-600 text-sm rounded-lg transition-colors">
                clear all
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="font-serif text-4xl font-medium tracking-tight mb-8">Grocery list</h1>

        {items.length === 0 ? (
          <p className="text-stone-300 text-sm italic">nothing here yet — add ingredients from a recipe</p>
        ) : (
          <div>
            {/* Unchecked items */}
            <ul className="space-y-1 mb-6">
              {unchecked.map(item => (
                <li key={item.id} className="flex items-center gap-4 py-3 border-b border-stone-100">
                  <button
                    onClick={() => toggle(item.id)}
                    className="w-6 h-6 rounded border-2 border-stone-300 flex items-center justify-center flex-shrink-0 transition-colors hover:border-stone-500"
                  />
                  <span className="text-base text-stone-700 flex-1">{item.text}</span>
                  <button onClick={() => deleteItem(item.id)} className="text-stone-200 hover:text-red-400 transition-colors text-lg flex-shrink-0">×</button>
                </li>
              ))}
            </ul>

            {/* Checked items */}
            {checked.length > 0 && (
              <ul className="space-y-1">
                {checked.map(item => (
                  <li key={item.id} className="flex items-center gap-4 py-3 border-b border-stone-100">
                    <button
                      onClick={() => toggle(item.id)}
                      className="w-6 h-6 rounded border-2 border-stone-300 bg-stone-900 border-stone-900 flex items-center justify-center flex-shrink-0 transition-colors"
                    >
                      <svg viewBox="0 0 10 8" className="w-3 h-3">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span className="text-base text-stone-300 line-through flex-1">{item.text}</span>
                    <button onClick={() => deleteItem(item.id)} className="text-stone-200 hover:text-red-400 transition-colors text-lg flex-shrink-0">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
