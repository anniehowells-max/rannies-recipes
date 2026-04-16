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

const FORM_ADJ = 'boneless|skinless|bone-in|skin-on|deveined'

// Extracts form descriptors (boneless, skinless etc.) from a name, returning
// the cleaned name and a formatted descriptor string to append.
function extractFormDescriptors(s: string): { name: string; descriptors: string } {
  const re = new RegExp(`\\b(${FORM_ADJ})\\b`, 'gi')
  const found: string[] = []
  let m
  while ((m = re.exec(s)) !== null) found.push(m[1].toLowerCase())
  if (found.length === 0) return { name: s, descriptors: '' }

  // Remove them from the string — leading, trailing, and inline
  let cleaned = s
  cleaned = cleaned.replace(new RegExp(`^(?:\\b(?:${FORM_ADJ})\\b,?\\s*)+`, 'i'), '').trim()
  cleaned = cleaned.replace(new RegExp(`,\\s*(?:(?:\\b(?:${FORM_ADJ})\\b)(?:\\s*(?:and|,)\\s*)?)+\\s*$`, 'i'), '').trim()
  cleaned = cleaned.replace(new RegExp(`\\b(?:${FORM_ADJ})\\b,?\\s*`, 'gi'), '').trim()

  const unique = [...new Set(found)]
  const descriptors = unique.length === 1
    ? unique[0]
    : unique.slice(0, -1).join(', ') + ' and ' + unique[unique.length - 1]

  return { name: cleaned, descriptors }
}

function stripPrepInstructions(name: string): string {
  let s = name.trim()

  const adverbs = '(?:very\\s+)?(?:finely|roughly|coarsely|thinly|thickly|lightly|loosely|well)?\\s*'
  const prepWords = '(?:chopped|diced|sliced|minced|grated|shredded|crushed|peeled|pitted|toasted|roasted|drained|rinsed|trimmed|halved|quartered|cubed|crumbled|beaten|whisked|melted|softened|sifted|zested|juiced|squeezed|torn|bruised|pressed|smashed|mashed|blended|pureed|ground|cut)'

  // Remove trailing comma-separated prep: "garlic, finely minced" → "garlic"
  s = s.replace(new RegExp(`,\\s*${adverbs}${prepWords}\\s*$`, 'i'), '').trim()

  // Remove leading prep adverb + verb: "finely grated garlic" → "garlic"
  s = s.replace(new RegExp(`^${adverbs}${prepWords}\\s+`, 'i'), '').trim()

  return s || name.trim()
}

function reorderIngredient(ingredient: string): string {
  const s = ingredient.trim()

  const unicodeFrac = '[½¼¾⅓⅔⅛⅜⅝⅞]'
  const singleNum = `(?:\\d+\\s*${unicodeFrac}|\\d+(?:[/.]\\d+)?|${unicodeFrac})`
  const fullQty = `(?:${singleNum})(?:\\s*(?:to|-)\\s*${singleNum})?`
  const units = '(?:tbsp|tablespoons?|tsp|teaspoons?|cups?|fl\\.?\\s*oz|ounces?|oz|pounds?|lbs?|lb|kg|g|mg|ml|cl|dl|litres?|liters?|l|pints?|quarts?|gallons?|handfuls?|pinch(?:es)?|dash(?:es)?|sprigs?|bunch(?:es)?|slices?|cans?|tins?|packs?|packets?|jars?|bottles?|heads?|cloves?|sticks?|pieces?|sheets?)'

  function buildName(raw: string): string {
    const withoutOf = raw.replace(/^of\s+/i, '').trim()
    const { name, descriptors } = extractFormDescriptors(withoutOf)
    const clean = stripPrepInstructions(name)
    return descriptors ? `${clean}, ${descriptors}` : clean
  }

  // Try: quantity + unit + name
  let match = s.match(new RegExp(`^(${fullQty}\\s*${units}\\b)\\s*(.+)$`, 'i'))
  if (match) return `${buildName(match[2])} (${match[1].trim()})`

  // Try: quantity only + name
  match = s.match(new RegExp(`^(${fullQty})\\s+(.+)$`))
  if (match) return `${buildName(match[2])} (${match[1].trim()})`

  // No quantity
  return buildName(s)
}

export function addIngredientsToList(ingredients: string[]) {
  const current = loadGroceryList()
  const newItems: GroceryItem[] = ingredients.map(raw => {
    const text = reorderIngredient(raw)
    return {
      id: crypto.randomUUID(),
      text: text.charAt(0).toUpperCase() + text.slice(1),
      checked: false,
    }
  })
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
